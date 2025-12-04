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
  TrendingUp,
  DollarSign,
  Building,
  Landmark,
  Activity,
  Zap,
  Server,
  HardDrive,
  Power,
  Cpu,
  AlertTriangle,
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
import { PlaidLinkUpdate } from "@/components/shared/plaid-link-update";

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

/**
 * Bank Accounts View Component
 * Displays bank connections with server rack aesthetic and family member ownership.
 *
 * @implements BR-039 - Smart Fix Adoption
 * @implements BR-035 - Item Error Detection & Recovery
 * @satisfies US-020 - Monitor Bank Connection Health
 * 
 * Features:
 * - Horizontal server rack layout (distinct from credit cards)
 * - Family member ownership display
 * - Power button status indicators
 * - Warning badge for unlinked connections
 * - Responsive grid layout
 */
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
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  // Filter items by active user and exclude inactive items (BR-039)
  const filteredItems =
    activeUser === "all"
      ? items.filter((item) => item.status !== "inactive")
      : items.filter((item) => item.familyMemberId === activeUser && item.status !== "inactive");

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
            body: JSON.stringify({ itemId: item.id }),
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

  /**
   * Count bank connections that need user attention
   * @param items - Array of PlaidItem objects
   * @returns Number of items with needs_reauth or disconnected status
   */
  const needsReauthCount = items.filter(
    (item) => item.status === "needs_reauth" || item.status === "disconnected"
  ).length;

  return (
    <div className="pb-24 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold text-white">Bank Accounts</h2>
          {needsReauthCount > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 border border-amber-500/30 rounded-full">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span className="text-sm font-medium text-amber-300">
                {needsReauthCount} Need{needsReauthCount !== 1 ? "s" : ""} Update
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
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
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredItems.map((item) => {
            const totalBalance = item.accounts.reduce(
              (sum, acc) => sum + (acc.currentBalance || 0),
              0,
            );

            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                onClick={() => setSelectedItem(item)}
                className="bg-gradient-to-r from-slate-900/50 to-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-xl overflow-hidden hover:border-slate-600/50 transition-all cursor-pointer group relative"
              >
                {/* Horizontal server rack style */}
                <div className="h-20 bg-gradient-to-r from-blue-600/10 via-purple-500/5 to-slate-700/10 relative overflow-hidden">
                  {/* Rack rails */}
                  <div className="absolute top-2 left-4 bottom-2 w-1 bg-slate-700/50 rounded-full"></div>
                  <div className="absolute top-2 right-4 bottom-2 w-1 bg-slate-700/50 rounded-full"></div>
                  
                  {/* Server rack units */}
                  <div className="absolute inset-0 flex items-center">
                    {/* Bank logo as server unit */}
                    <div className="flex-1 flex items-center justify-center">
                      <div className="w-12 h-12 bg-slate-800/50 rounded-lg border border-slate-600/50 flex items-center justify-center">
                        <BankLogo
                          name={item.institutionName}
                          bankId={item.bankId}
                          size="sm"
                        />
                      </div>
                    </div>
                    
                    {/* Ventilation grills */}
                    <div className="flex gap-0.5 h-8 opacity-20 mx-4">
                      {[...Array(8)].map((_, i) => (
                        <div key={i} className="w-0.5 bg-slate-600 rounded-full"></div>
                      ))}
                    </div>
                    
                    {/* Status indicator with power button */}
                    <div className="flex-1 flex items-center justify-end px-4">
                      <div className={`px-3 py-1 rounded-full text-xs font-medium border backdrop-blur-sm flex items-center gap-2 ${
                        item.status === "active"
                          ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                          : item.status === "needs_reauth"
                            ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                            : "bg-red-500/20 text-red-300 border-red-500/30"
                      }`}>
                        <Power className={`w-3 h-3 ${
                          item.status === "active" 
                            ? "text-emerald-400" 
                            : item.status === "needs_reauth"
                              ? "text-amber-400"
                              : "text-red-400"
                        }`} />
                        {item.status === "needs_reauth"
                          ? "Reauth Required"
                          : item.status === "disconnected"
                            ? "Offline"
                            : "Connected"}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Info panel below rack */}
                <div className="p-4 bg-slate-900/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {/* Family member indicator */}
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full border border-white/20 bg-indigo-500/20 flex items-center justify-center">
                          <span className="text-xs font-medium text-indigo-300">
                            {familyMembers.find(m => m.id === item.familyMemberId)?.name?.substring(0, 2)?.toUpperCase() || "FM"}
                          </span>
                        </div>
                        <span className="text-xs text-slate-400 font-medium max-w-[80px] truncate">
                          {familyMembers.find(m => m.id === item.familyMemberId)?.name?.substring(0, 10) || "Unknown"}
                          {(familyMembers.find(m => m.id === item.familyMemberId)?.name?.length ?? 0) > 10 && "..."}
                        </span>
                      </div>
                      
                      <div className="w-px h-4 bg-slate-700/50"></div>
                      
                      <div>
                        <h3 className="font-semibold text-white text-sm">
                          {item.institutionName || "Unknown Bank"}
                        </h3>
                        <p className="text-slate-400 text-xs">
                          {item.accounts.length} Account{item.accounts.length !== 1 ? "s" : ""}
                        </p>
                      </div>
                    </div>

                    {/* Connection metrics */}
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <Activity className="w-3 h-3" />
                        <span>
                          {item.status === "active" ? "Connected" : "Error"}
                        </span>
                      </div>
                      
                      <div className="h-6 w-px bg-slate-700/50"></div>
                      
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <Server className="w-3 h-3" />
                        <span>
                          {item.accounts.length} Account{item.accounts.length !== 1 ? "s" : ""}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                {(item.status === "needs_reauth" ||
                  item.status === "disconnected") && (
                  <div className="mb-4" onClick={(e) => e.stopPropagation()}>
                    <PlaidLinkUpdate
                      itemId={item.id}
                      institutionName={item.institutionName || "Bank"}
                      status={item.status}
                      onSuccess={fetchData}
                      variant={
                        item.status === "disconnected"
                          ? "default"
                          : "destructive"
                      }
                      className="w-full"
                    />
                  </div>
                )}

                {/* Subtle hover effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl pointer-events-none" />
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
        onUpdateSuccess={async () => {
          await fetchData();
          // Update selectedItem with fresh data if it's still open
          if (selectedItem) {
            const updatedItems = await fetch("/api/plaid/items").then((r) =>
              r.json(),
            );
            const unwrapped = updatedItems.data ?? updatedItems;
            const updated = Array.isArray(unwrapped)
              ? unwrapped.find((item) => item.id === selectedItem.id)
              : null;
            if (updated) {
              setSelectedItem(updated);
            }
          }
        }}
      />
    </div>
  );
}
