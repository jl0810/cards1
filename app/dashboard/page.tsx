"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { LayoutGrid, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useIsAdmin } from "@/hooks/use-admin";
import { logger } from "@/lib/logger";
import {
  USER_AVATAR_COLORS,
  DEFAULT_CURRENCY,
  DATE_FORMATS,
} from "@/lib/constants";
import { PlaidItemSchema, AccountSchema } from "@/lib/validations";
import type { FamilyMember } from "@/types/dashboard";
import type { z } from "zod";
import { calculatePaymentCycleStatus } from "@/lib/payment-cycle";
import { WalletView } from "@/components/velocity/wallet-view";
import { ActivityView } from "@/components/velocity/activity-view";
import { SettingsView } from "@/components/velocity/settings-view";
import { BankAccountsView } from "@/components/velocity/bank-accounts-view";
import { AppHeader } from "@/components/layout/app-header";
import { NavDock } from "@/components/layout/nav-dock";

type PlaidItem = z.infer<typeof PlaidItemSchema>;
type Account = z.infer<typeof AccountSchema>;

export default function DashboardPage() {
  const router = useRouter();
  const isAdmin = useIsAdmin();
  const [activeTab, setActiveTab] = useState("wallet");
  const [activeUser, setActiveUser] = useState("all");
  const [users, setUsers] = useState<FamilyMember[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const formatCurrency = (
    value: number | null | undefined,
    currency?: string | null,
  ) => {
    if (value === null || value === undefined) return "N/A";
    try {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: currency || DEFAULT_CURRENCY,
      }).format(value);
    } catch {
      return `$${value.toLocaleString()}`;
    }
  };

  const formatPercent = (value: number | null | undefined) => {
    if (value === null || value === undefined) return "N/A";
    return `${value.toFixed(2)}%`;
  };

  const formatDate = (value: string | null | undefined) => {
    if (!value) return "N/A";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "N/A";
    return date.toLocaleDateString("en-US", DATE_FORMATS.SHORT);
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/user/family");
      if (res.ok) {
        const data = await res.json();
        // Transform to UI format
        const formattedUsers: FamilyMember[] = data.map(
          (
            u: {
              id: string;
              name: string;
              avatar?: string;
              role?: string;
              isPrimary?: boolean;
            },
            index: number,
          ) => ({
            id: u.id,
            name: u.name,
            avatar: u.avatar || u.name[0],
            role: u.role || (u.isPrimary ? "Owner" : "Member"),
            color: USER_AVATAR_COLORS[index % USER_AVATAR_COLORS.length],
          }),
        );
        setUsers(formattedUsers);
      }
    } catch (error) {
      logger.error("Error fetching users", error);
    }
  };

  // Refresh all Plaid data
  const refreshAll = async () => {
    setRefreshing(true);
    try {
      // Fetch all items first
      const itemsRes = await fetch("/api/plaid/items");
      if (!itemsRes.ok) throw new Error("Failed to fetch items");
      const items = await itemsRes.json();

      // Sync each item
      let successCount = 0;
      let failCount = 0;
      let rateLimitHit = false;

      for (const item of items) {
        try {
          const syncRes = await fetch("/api/plaid/sync-transactions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ itemId: item.itemId }),
          });

          if (syncRes.ok) {
            successCount++;
          } else {
            if (syncRes.status === 429) {
              rateLimitHit = true;
              logger.warn("Rate limit hit for item", {
                institutionName: item.institutionName,
              });
            } else {
              failCount++;
            }
          }
        } catch (e) {
          logger.error("Failed to sync item", e, {
            institutionName: item.institutionName,
          });
          failCount++;
        }
      }

      // Reload account data
      await fetchAccounts();

      if (rateLimitHit) {
        toast.warning(
          `Rate limit reached. Some accounts may not have updated. Please wait a while before refreshing again.`,
        );
      } else if (successCount > 0 && failCount === 0) {
        toast.success(`Successfully refreshed all ${successCount} connections`);
      } else if (successCount > 0 && failCount > 0) {
        toast.info(
          `Refreshed ${successCount} connections. ${failCount} failed to update.`,
        );
      } else if (failCount > 0) {
        toast.error(`Failed to refresh connections. Please try again later.`);
      }
    } catch (error) {
      logger.error("Error refreshing accounts", error);
      toast.error("Failed to refresh accounts");
    } finally {
      setRefreshing(false);
    }
  };

  // Handlers for Settings Actions
  const addMember = async (name: string) => {
    try {
      const res = await fetch("/api/user/family", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      if (res.ok) {
        const newMember = await res.json();
        const newColor =
          USER_AVATAR_COLORS[users.length % USER_AVATAR_COLORS.length];

        setUsers([
          ...users,
          {
            id: newMember.id,
            name: newMember.name,
            avatar: newMember.name[0],
            role: "Member",
            color: newColor,
          },
        ]);

        toast.success(`${name} has been added to your family`);
      } else {
        const text = await res.text();
        toast.error(text || "Failed to add family member");
      }
    } catch (error) {
      logger.error("Error adding member", error);
      toast.error("Failed to add family member");
    }
  };

  const deleteMember = async (id: string) => {
    const memberToDelete = users.find((u) => u.id === id);
    if (!memberToDelete) return;

    // Pre-check: Can this member be deleted?
    try {
      const checkRes = await fetch(`/api/user/family/${id}/check-delete`);
      if (!checkRes.ok) {
        const errorText = await checkRes.text();
        toast.error(errorText, { duration: 5000 });
        return;
      }
    } catch (error) {
      logger.error("Error checking delete eligibility", error);
      toast.error("Failed to verify deletion eligibility");
      return;
    }

    // Show confirmation toast with action buttons
    toast.custom(
      (t) => (
        <div className="bg-dark-800 border border-white/10 rounded-xl p-4 shadow-2xl backdrop-blur-xl">
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <p className="text-sm font-bold text-white mb-1">
                Remove {memberToDelete.name}?
              </p>
              <p className="text-xs text-slate-400">
                This action cannot be undone.
              </p>
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => {
                toast.dismiss(t);
                performDelete(id, memberToDelete.name);
              }}
              className="flex-1 px-3 py-1.5 text-xs font-bold bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
            >
              Remove
            </button>
            <button
              onClick={() => toast.dismiss(t)}
              className="flex-1 px-3 py-1.5 text-xs font-bold bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ),
      { duration: Infinity },
    );
  };

  const performDelete = async (id: string, name: string) => {
    try {
      const res = await fetch(`/api/user/family/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setUsers(users.filter((u) => u.id !== id));
        toast.success(`${name} has been removed`);
      } else {
        const text = await res.text();
        toast.error(text);
      }
    } catch (error) {
      logger.error("Error deleting member", error);
      toast.error("Failed to remove family member");
    }
  };

  const updateMember = async (id: string, name: string) => {
    try {
      const res = await fetch(`/api/user/family/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      if (res.ok) {
        const updatedMember = await res.json();
        setUsers(
          users.map((u) =>
            u.id === id ? { ...u, name: updatedMember.name } : u,
          ),
        );
        toast.success(`Renamed to ${updatedMember.name}`);
      } else {
        const text = await res.text();
        toast.error(text);
      }
    } catch (error) {
      logger.error("Error updating member", error);
      toast.error("Failed to update family member");
    }
  };

  const linkBank = () => {
    setActiveTab("banks");
  };

  const fetchAccounts = async () => {
    try {
      const res = await fetch("/api/plaid/items");
      if (!res.ok) {
        const text = await res.text();
        // If 404 (User profile not found), just return empty list
        if (res.status === 404) {
          setAccounts([]);
          return;
        }
        throw new Error(text || "Failed to fetch items");
      }
      const response = await res.json();

      // API returns { success: true, data: [...] } format
      const items = response.data ?? response;

      // Defensive check: ensure items is an array
      if (!Array.isArray(items)) {
        logger.warn("Expected array from /api/plaid/items", {
          receivedType: typeof items,
        });
        setAccounts([]);
        return;
      }

      // Transform Plaid items/accounts into WalletView format
      const allAccounts = items.flatMap((item: PlaidItem) =>
        (item.accounts || []).map((acc: Account) => {
          // Calculate Payment Cycle Status
          const paymentCycleStatus = calculatePaymentCycleStatus({
            lastStatementBalance: acc.lastStatementBalance || 0,
            lastStatementIssueDate: acc.lastStatementIssueDate
              ? new Date(acc.lastStatementIssueDate)
              : null,
            currentBalance: acc.currentBalance || 0,
            paymentMarkedPaidDate: acc.extended?.paymentMarkedPaidDate
              ? new Date(acc.extended.paymentMarkedPaidDate)
              : null,
            lastPaymentAmount: acc.lastPaymentAmount || null,
            lastPaymentDate: acc.lastPaymentDate
              ? new Date(acc.lastPaymentDate)
              : null,
          });

          return {
            id: acc.id,
            userId: acc.familyMemberId || item.familyMemberId || "",
            bank: item.institutionName || "Unknown Bank",
            bankId: item.bankId, // Pass through the bankId from PlaidItem
            name: acc.extended?.nickname ?? acc.officialName ?? acc.name,
            balance: acc.currentBalance || 0,
            paymentCycleStatus, // Add the calculated status
            due: acc.nextPaymentDueDate
              ? (() => {
                  const diffDays = Math.ceil(
                    (new Date(acc.nextPaymentDueDate).getTime() - Date.now()) /
                      (1000 * 60 * 60 * 24),
                  );
                  if (diffDays < 0) return "Overdue";
                  if (diffDays === 0) return "Today";
                  if (diffDays === 1) return "Tomorrow";
                  return `${diffDays} days`;
                })()
              : "N/A",
            type: acc.subtype || acc.type,
            color: "from-slate-800 to-slate-900", // Default color
            liabilities: {
              apr: formatPercent(acc.apr ? Number(acc.apr) : undefined),
              aprType: acc.aprType || "N/A",
              aprBalanceSubjectToApr: formatCurrency(
                acc.aprBalanceSubjectToApr
                  ? Number(acc.aprBalanceSubjectToApr)
                  : undefined,
                acc.isoCurrencyCode,
              ),
              aprInterestChargeAmount: formatCurrency(
                acc.aprInterestChargeAmount
                  ? Number(acc.aprInterestChargeAmount)
                  : undefined,
                acc.isoCurrencyCode,
              ),
              limit: formatCurrency(
                acc.limit ? Number(acc.limit) : undefined,
                acc.isoCurrencyCode,
              ),
              min_due: formatCurrency(
                acc.minPaymentAmount ? Number(acc.minPaymentAmount) : undefined,
                acc.isoCurrencyCode,
              ),
              last_statement: formatCurrency(
                acc.lastStatementBalance,
                acc.isoCurrencyCode,
              ),
              next_due_date: formatDate(acc.nextPaymentDueDate),
              last_statement_date: formatDate(acc.lastStatementIssueDate),
              last_payment_amount: formatCurrency(
                acc.lastPaymentAmount,
                acc.isoCurrencyCode,
              ),
              last_payment_date: formatDate(acc.lastPaymentDate),
              status: acc.isOverdue
                ? "Overdue"
                : acc.nextPaymentDueDate
                  ? "Current"
                  : "N/A",
            },
          };
        }),
      );

      setAccounts(allAccounts);
    } catch (error) {
      logger.error("Error fetching accounts", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
    fetchUsers();
  }, []);

  if (loading)
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-dark-900 text-white">
        <div className="w-12 h-12 border-t-2 border-brand-primary rounded-full mb-6 animate-spin"></div>
      </div>
    );

  return (
    <div className="min-h-screen bg-mesh bg-cover bg-fixed text-slate-200 font-sans selection:bg-brand-primary/30 bg-dark-900">
      {/* HEADER */}
      <AppHeader>
        <button
          onClick={() => setActiveUser("all")}
          className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold transition-all border ${activeUser === "all" ? "bg-white text-black border-white shadow-lg" : "bg-glass-100 text-slate-400 border-transparent"}`}
        >
          <LayoutGrid className="w-4 h-4" /> All
        </button>
        {users.map((user) => (
          <button
            key={user.id}
            onClick={() => setActiveUser(user.id)}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold transition-all border ${activeUser === user.id ? "bg-white text-black border-white shadow-lg" : "bg-glass-100 text-slate-400 border-transparent"}`}
          >
            <div className={`w-2 h-2 rounded-full ${user.color}`} /> {user.name}
          </button>
        ))}
        <button
          onClick={refreshAll}
          disabled={refreshing}
          className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold transition-all border bg-glass-100 text-slate-400 border-transparent hover:bg-glass-200 disabled:opacity-50`}
        >
          <RefreshCw
            className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
          />
          {refreshing ? "Syncing..." : "Refresh"}
        </button>
      </AppHeader>

      {/* MAIN CONTENT */}
      <main className="px-5 pt-4">
        <AnimatePresence mode="wait">
          {activeTab === "wallet" && (
            <motion.div
              key="wallet"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <WalletView
                users={users}
                accounts={accounts}
                activeUser={activeUser}
              />
            </motion.div>
          )}
          {activeTab === "activity" && (
            <motion.div
              key="activity"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <ActivityView activeUser={activeUser} />
            </motion.div>
          )}
          {activeTab === "banks" && (
            <motion.div
              key="banks"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <BankAccountsView activeUser={activeUser} />
            </motion.div>
          )}
          {activeTab === "settings" && (
            <motion.div
              key="settings"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <SettingsView
                users={users}
                accounts={accounts}
                onAddMember={addMember}
                onUpdateMember={updateMember}
                onDeleteMember={deleteMember}
                onLinkBank={linkBank}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* NAVIGATION DOCK */}
      <NavDock
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isAdmin={isAdmin}
      />
    </div>
  );
}
