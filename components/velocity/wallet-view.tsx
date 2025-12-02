"use client";

import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CreditCard as CreditCardIcon, List } from "lucide-react";
import { CreditCard } from "./credit-card";
import { BankLogo } from "./bank-logo";

// Helper for animation
const FadeIn = ({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -10 }}
    transition={{ duration: 0.3, delay }}
    className={className}
  >
    {children}
  </motion.div>
);

import { UserSchema, AccountSchema } from "@/lib/validations";
import type { z } from "zod";

type User = z.infer<typeof UserSchema>;
type Account = z.infer<typeof AccountSchema>;

interface Bank {
  id: string;
  name: string;
  totalBalance: number;
  accounts: Account[];
}

export function WalletView({
  users,
  accounts,
  activeUser,
}: {
  users: User[];
  accounts: Account[];
  activeUser: string;
}) {
  const [layout, setLayout] = useState("grid");
  const [activeBank, setActiveBank] = useState("all");

  useEffect(() => {
    setActiveBank("all");
  }, [activeUser]);

  const userAccounts = useMemo(
    () =>
      activeUser === "all"
        ? accounts
        : accounts.filter((a) => a.userId === activeUser),
    [activeUser, accounts],
  );
  const banks = useMemo(() => {
    const bankNames = ["all", ...new Set(userAccounts.map((a) => a.bank))];
    // Map bank names to their IDs and bankData for logo display
    return bankNames.map((bankName) => {
      if (bankName === "all") return { name: "all", id: null, data: null };
      const account = userAccounts.find((a) => a.bank === bankName);
      const result = {
        name: bankName,
        id: account?.bankId || null,
        data: account?.bankData || null,
      };
      console.log("Bank mapping for", bankName, {
        hasBankData: !!account?.bankData,
        bankId: account?.bankId,
      });
      return result;
    });
  }, [userAccounts]);
  const filteredAccounts = useMemo(
    () =>
      activeBank === "all"
        ? userAccounts
        : userAccounts.filter((a) => a.bank === activeBank),
    [userAccounts, activeBank],
  );
  const total = filteredAccounts.reduce((acc, cur) => acc + cur.balance, 0);

  return (
    <div className="space-y-6 pb-24">
      <FadeIn className="text-center py-4">
        <p className="text-sm text-slate-400 font-medium mb-1">Total Balance</p>
        <h2 className="text-5xl font-bold text-white tracking-tighter">
          ${total.toLocaleString("en-US", { minimumFractionDigits: 2 })}
        </h2>
      </FadeIn>

      <div className="flex justify-center px-4">
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-1.5 bg-glass-100 rounded-full border border-white/5 max-w-full">
          {banks.map(
            (bank: {
              name: string;
              id: string | null;
              data: {
                id: string;
                name: string;
                logoUrl: string | null;
                logoSvg: string | null;
                brandColor: string | null;
              } | null;
            }) => (
              <button
                key={bank.name}
                onClick={() => setActiveBank(bank.name)}
                className={`flex items-center justify-center px-2.5 py-1.5 rounded-full text-xs font-bold transition-all flex-shrink-0 ${
                  activeBank === bank.name
                    ? "bg-white text-black shadow-lg"
                    : "text-slate-400 hover:text-white"
                }`}
                title={bank.name === "all" ? "All Banks" : bank.name}
              >
                {bank.name === "all" ? (
                  <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                    <CreditCardIcon className="w-3.5 h-3.5" />
                  </div>
                ) : (
                  <BankLogo
                    name={bank.name}
                    bankId={bank.id}
                    bankData={bank.data}
                    size="sm"
                  />
                )}
              </button>
            ),
          )}
        </div>
      </div>

      {/* Current bank indicator */}
      <div className="text-center">
        <p className="text-xs text-slate-500 font-medium">
          {activeBank === "all" ? "All Banks" : activeBank}
        </p>
      </div>

      <div className="flex items-center justify-between px-1">
        <h3 className="text-sm font-bold text-slate-300">Cards & Accounts</h3>
        <div className="bg-glass-200 p-1 rounded-lg flex gap-1">
          <button
            onClick={() => setLayout("grid")}
            className={`p-2 rounded-md transition-all min-w-[44px] min-h-[44px] flex items-center justify-center ${
              layout === "grid" ? "bg-white/10 text-white" : "text-slate-500"
            }`}
            aria-label="Grid view"
          >
            <CreditCardIcon size={18} />
          </button>
          <button
            onClick={() => setLayout("list")}
            className={`p-2 rounded-md transition-all min-w-[44px] min-h-[44px] flex items-center justify-center ${
              layout === "list" ? "bg-white/10 text-white" : "text-slate-500"
            }`}
            aria-label="List view"
          >
            <List size={18} />
          </button>
        </div>
      </div>

      <div
        className={`grid gap-4 ${layout === "grid" ? "grid-cols-1 sm:grid-cols-2 md:grid-cols-3" : "grid-cols-1"}`}
      >
        <AnimatePresence>
          {filteredAccounts.map((acc, i) => (
            <FadeIn key={acc.id} delay={i * 0.05}>
              <CreditCard acc={acc} layout={layout} />
            </FadeIn>
          ))}
        </AnimatePresence>
        {filteredAccounts.length === 0 && (
          <div className="text-center py-10 text-slate-500">
            <p>No accounts found</p>
          </div>
        )}
      </div>
    </div>
  );
}
