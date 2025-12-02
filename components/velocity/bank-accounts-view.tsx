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
import { BankLogo } from "./bank-logo";
import { BankDetailsSheet } from "./bank-details-sheet";

export interface PlaidAccount {
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

export interface PlaidItem {
  id: string;
  itemId: string;
  institutionName: string | null;
  status: string;
  accounts: PlaidAccount[];
  familyMemberId: string;
  bankId?: string | null;
}

export interface FamilyMember {
  id: string;
  name: string;
  avatar?: string | null;
  isPrimary: boolean;
}

export function BankAccountsView({
  activeUser = "all",
  onLinkSuccess,
}: {
  activeUser?: string;
  onLinkSuccess?: () => void;
}) {
  const [items, setItems] = useState<PlaidItem[]>([]);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<PlaidItem | null>(null);

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

  const formatCurrency = (
    amount: number | null,
    currency: string | null = "USD",
  ) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
    }).format(amount || 0);
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
          <PlaidLinkWithFamily
            familyMembers={familyMembers}
            onSuccess={fetchData}
          />
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((item) => {
            const totalBalance = item.accounts.reduce(
              (sum, acc) => sum + (acc.currentBalance || 0),
              0,
            );

            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => setSelectedItem(item)}
                className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-colors cursor-pointer group relative overflow-hidden"
              >
                <div className="flex items-center justify-between mb-4">
                  <BankLogo
                    name={item.institutionName}
                    bankId={item.bankId}
                    size="md"
                  />
                  <div
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      item.status === "active"
                        ? "bg-green-500/10 text-green-400"
                        : item.status === "needs_reauth"
                          ? "bg-red-500/10 text-red-400"
                          : "bg-slate-500/10 text-slate-400"
                    }`}
                  >
                    {item.status === "needs_reauth"
                      ? "Action Required"
                      : item.status}
                  </div>
                </div>

                <h3 className="font-semibold text-white text-lg mb-1 truncate">
                  {item.institutionName || "Unknown Bank"}
                </h3>

                <p className="text-slate-400 text-sm mb-4">
                  {item.accounts.length} Account
                  {item.accounts.length !== 1 ? "s" : ""}
                </p>

                <div className="flex items-center justify-between text-sm border-t border-white/5 pt-3">
                  <span className="text-slate-500">Total Balance</span>
                  <span className="text-white font-mono">
                    {formatCurrency(totalBalance)}
                  </span>
                </div>

                {/* Hover effect */}
                <div className="absolute inset-0 border-2 border-primary/0 group-hover:border-primary/50 rounded-xl transition-colors pointer-events-none" />
              </motion.div>
            );
          })}
        </div>
      )}

      <BankDetailsSheet
        item={selectedItem}
        isOpen={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        familyMembers={familyMembers}
        onUpdateFamilyMember={updateItemFamilyMember}
        onDisconnect={async (itemId) => {
          await disconnectItem(itemId);
          setSelectedItem(null);
        }}
        onUpdateSuccess={fetchData}
      />
    </div>
  );
}
