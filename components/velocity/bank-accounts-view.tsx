"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Building2,
  CreditCard,
  Plus,
  Trash2,
  RefreshCw,
  Users,
  Link as LinkIcon,
  AlertCircle,
} from "lucide-react";
import dynamic from "next/dynamic";

const PlaidLinkWithFamily = dynamic(
  () =>
    import("@/components/shared/plaid-link-with-family").then((mod) => ({
      default: mod.default,
    })),
  {
    loading: () => (
      <div className="h-11 flex items-center justify-center">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
      </div>
    ),
    ssr: false,
  },
);
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";
import { useBankBrand } from "@/hooks/use-bank-brand";
import { FamilyMemberSelector } from "./family-member-selector";
import { CardProductMatcher } from "./card-product-matcher";
import { LinkedCardDisplay } from "./linked-card-display";
import { PlaidLinkUpdate } from "@/components/shared/plaid-link-update";

function BankLogo({
  name,
  bankId,
}: {
  name: string | null;
  bankId?: string | null;
}) {
  const { brand, loading } = useBankBrand(bankId || null);
  const [error, setError] = useState(false);

  // Get initials from bank name
  const getInitials = (bankName: string | null) => {
    if (!bankName) return "B";
    const words = bankName.split(" ").filter((w) => w.length > 0);
    if (words.length === 1) return words[0].substring(0, 2).toUpperCase();
    return words
      .slice(0, 2)
      .map((w) => w[0])
      .join("")
      .toUpperCase();
  };

  // Get a color based on bank name (consistent hash)
  const getColor = (bankName: string | null) => {
    if (!bankName) return "bg-brand-primary";
    const colors = [
      "bg-blue-600",
      "bg-indigo-600",
      "bg-violet-600",
      "bg-purple-600",
      "bg-fuchsia-600",
      "bg-pink-600",
      "bg-rose-600",
      "bg-orange-600",
      "bg-amber-600",
      "bg-emerald-600",
      "bg-teal-600",
      "bg-cyan-600",
      "bg-sky-600",
    ];
    const hash = bankName
      .split("")
      .reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  if (loading || !brand?.logoUrl || error) {
    return (
      <div
        className={`w-10 h-10 rounded-lg flex items-center justify-center relative`}
        style={{ backgroundColor: brand?.brandColor || undefined }}
      >
        {!brand?.brandColor && (
          <div
            className={`absolute inset-0 rounded-lg ${getColor(name)} opacity-100`}
          />
        )}
        <span className="text-white text-xs font-bold relative z-10">
          {getInitials(name)}
        </span>
      </div>
    );
  }

  return (
    <div className="w-10 h-10 rounded-lg bg-white p-1 flex items-center justify-center overflow-hidden">
      <img
        src={brand.logoUrl}
        alt={name || "Bank Logo"}
        className="w-full h-full object-contain"
        loading="lazy"
        onError={() => setError(true)}
      />
    </div>
  );
}

interface PlaidAccount {
  id: string;
  name: string;
  officialName: string | null;
  mask: string;
  type: string;
  subtype: string;
  currentBalance: number | null;
  isoCurrencyCode: string | null;
  extended?: {
    id: string;
    nickname: string | null;
    cardProductId: string | null;
    cardProduct?: {
      id: string;
      issuer: string;
      productName: string;
      cardType: string | null;
      annualFee: number | null;
      signupBonus: string | null;
      imageUrl: string | null;
      benefits: Array<{
        id: string;
        benefitName: string;
        timing: string;
        maxAmount: number | null;
        keywords: string[];
      }>;
    } | null;
  } | null;
}

interface PlaidItem {
  id: string;
  itemId: string;
  institutionName: string | null;
  status: string;
  accounts: PlaidAccount[];
  familyMemberId: string;
  bankId?: string | null;
}

interface FamilyMember {
  id: string;
  name: string;
  avatar?: string | null;
  isPrimary: boolean;
}

export function BankAccountsView({
  activeUser = "all",
}: {
  activeUser?: string;
}) {
  const [items, setItems] = useState<PlaidItem[]>([]);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [linkingAccountId, setLinkingAccountId] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const [itemsRes, familyRes] = await Promise.all([
        fetch("/api/plaid/items"),
        fetch("/api/user/family"),
      ]);

      if (!itemsRes.ok) throw new Error("Failed to fetch items");
      if (!familyRes.ok) throw new Error("Failed to fetch family members");

      const itemsData = await itemsRes.json();
      const familyData = await familyRes.json();

      // API returns { success: true, data: [...] } format
      const unwrappedItems = itemsData.data ?? itemsData;
      const unwrappedFamily = familyData.data ?? familyData;

      // Ensure we have arrays
      setItems(Array.isArray(unwrappedItems) ? unwrappedItems : []);
      setFamilyMembers(Array.isArray(unwrappedFamily) ? unwrappedFamily : []);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  // Filter items by active user
  const filteredItems =
    activeUser === "all"
      ? items
      : items.filter((item) => item.familyMemberId === activeUser);

  const syncTransactions = async (itemId?: string) => {
    const itemsToSync = itemId
      ? items.filter((i) => i.itemId === itemId)
      : items;

    if (itemsToSync.length === 0) return;

    toast.promise(
      Promise.all(
        itemsToSync.map((item) =>
          fetch("/api/plaid/sync-transactions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ itemId: item.itemId, cursor: null }),
          }),
        ),
      ),
      {
        loading: itemId
          ? "Syncing transactions..."
          : `Syncing ${itemsToSync.length} connections...`,
        success: "Transactions synced!",
        error: "Failed to sync transactions",
      },
    );
  };

  const updateItemFamilyMember = async (
    itemId: string,
    familyMemberId: string,
  ) => {
    const originalItems = [...items];
    setItems(
      items.map((item) =>
        item.id === itemId ? { ...item, familyMemberId } : item,
      ),
    );

    try {
      const res = await fetch(`/api/plaid/items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ familyMemberId }),
      });

      if (!res.ok) throw new Error("Failed to update assignment");

      toast.success("Assigned to family member");
    } catch (error) {
      console.error(error);
      toast.error("Failed to update assignment");
      setItems(originalItems);
    }
  };

  const disconnectItem = async (itemId: string) => {
    const item = items.find((i) => i.id === itemId);
    if (!item) return;

    if (
      !confirm(
        `Disconnect ${item.institutionName}? This will stop syncing but preserve your data.`,
      )
    )
      return;

    try {
      const res = await fetch(`/api/plaid/items/${itemId}/disconnect`, {
        method: "POST",
      });

      if (!res.ok) throw new Error("Failed to disconnect item");

      // Refresh the list to show updated status
      await fetchData();
      toast.success(`${item.institutionName} disconnected`);
    } catch (error) {
      console.error(error);
      toast.error("Failed to disconnect bank");
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Calculate linking stats for drawer
  const allAccounts = items.flatMap((item) => item.accounts);
  const linkedAccounts = allAccounts.filter(
    (acc) => acc.extended?.cardProductId,
  );
  const linkingStats = {
    totalAccounts: allAccounts.length,
    linkedAccounts: linkedAccounts.length,
    unlinkAccounts: allAccounts.length - linkedAccounts.length,
  };

  return (
    <div className="pb-24 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Bank Accounts</h2>
        <div className="flex items-center gap-2">
          {items.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => syncTransactions()}
            >
              <RefreshCw className="w-4 h-4 mr-2" /> Sync All
            </Button>
          )}
          <PlaidLinkWithFamily familyMembers={familyMembers} />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <RefreshCw className="w-6 h-6 text-slate-500 animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center space-y-4 bg-white/5 rounded-2xl border border-white/10 p-8">
          <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
            <Building2 className="w-8 h-8 text-slate-400" />
          </div>
          <div>
            <h3 className="text-lg font-medium text-white">
              No accounts linked
            </h3>
            <p className="text-slate-400 text-sm mt-1">
              Connect your bank to start tracking your finances.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid gap-6">
          {filteredItems.map((item) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden"
            >
              <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/5">
                <div className="flex items-center gap-4">
                  <BankLogo name={item.institutionName} bankId={item.bankId} />
                  <div>
                    <h3 className="font-semibold text-white">
                      {item.institutionName || "Unknown Bank"}
                    </h3>
                    <p className="text-xs text-slate-400 capitalize">
                      {item.status}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <FamilyMemberSelector
                    currentMemberId={item.familyMemberId}
                    members={familyMembers}
                    onSelect={(memberId) =>
                      updateItemFamilyMember(item.id, memberId)
                    }
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => disconnectItem(item.id)}
                    className="text-slate-400 hover:text-red-400 hover:bg-red-400/10"
                    title="Disconnect Bank"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Alert for items needing reauth */}
              {item.status === "needs_reauth" && (
                <div className="p-4 border-b border-white/5">
                  <Alert
                    variant="destructive"
                    className="bg-red-500/10 border-red-500/20"
                  >
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Action Required</AlertTitle>
                    <AlertDescription className="mt-2 space-y-3">
                      <p>
                        Your connection to {item.institutionName} needs to be
                        updated. This usually happens when you change your
                        password or need to re-authorize access.
                      </p>
                      <PlaidLinkUpdate
                        itemId={item.id}
                        institutionName={item.institutionName || "this bank"}
                        onSuccess={() => window.location.reload()}
                        variant="destructive"
                        size="sm"
                      />
                    </AlertDescription>
                  </Alert>
                </div>
              )}

              <div className="p-4 space-y-3">
                {item.accounts.map((account) => (
                  <div key={account.id} className="space-y-2">
                    <div className="flex items-center justify-between p-3 rounded-xl bg-black/20 hover:bg-black/30 transition-colors">
                      <div className="flex items-center gap-3">
                        <CreditCard className="w-5 h-5 text-slate-500" />
                        <div>
                          <p className="text-sm font-medium text-slate-200">
                            {account.extended?.nickname ??
                              account.officialName ??
                              account.name}
                          </p>
                          <p className="text-xs text-slate-500">
                            •••• {account.mask}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-mono text-sm text-white">
                            {new Intl.NumberFormat("en-US", {
                              style: "currency",
                              currency: account.isoCurrencyCode || "USD",
                            }).format(account.currentBalance || 0)}
                          </p>
                          <p className="text-xs text-slate-500 capitalize">
                            {account.subtype || account.type}
                          </p>
                        </div>
                        <button
                          onClick={() => setLinkingAccountId(account.id)}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold rounded-lg transition-all bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10"
                          title="Link to Card Product"
                        >
                          <LinkIcon className="w-3 h-3" />
                          {account.extended?.cardProduct ? "Change" : "Link"}
                        </button>
                      </div>
                    </div>

                    {/* Linked Card Preview */}
                    {account.extended?.cardProduct && (
                      <div className="pl-4">
                        <LinkedCardDisplay
                          product={account.extended.cardProduct}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Matcher Modal */}
      {linkingAccountId &&
        (() => {
          const allAccounts = items.flatMap((i) => i.accounts);
          const account = allAccounts.find((a) => a.id === linkingAccountId);
          const item = items.find((i) =>
            i.accounts.some((a) => a.id === linkingAccountId),
          );

          if (!account || !item) return null;

          return (
            <CardProductMatcher
              isOpen={!!linkingAccountId}
              onClose={() => setLinkingAccountId(null)}
              accountId={account.id}
              accountName={account.name}
              institutionName={item.institutionName}
              bankId={item.bankId} // ✅ Use FK relationship!
              currentProductId={account.extended?.cardProductId}
              stats={linkingStats}
              onSuccess={() => {
                setLinkingAccountId(null);
                fetchData(); // Refresh to show linked card
              }}
            />
          );
        })()}
    </div>
  );
}
