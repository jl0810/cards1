"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CreditCard as CreditCardIcon, List } from "lucide-react";
import { createPortal } from "react-dom";
import { CreditCard } from "./credit-card";
import { PaymentCycleStatus } from "@/lib/payment-cycle";
import { BankLogo } from "./bank-logo";

// FilterDropdown Component
interface FilterOption {
  value: string;
  label: string;
}

interface FilterDropdownProps {
  icon: string;
  label: string;
  value: string;
  options: FilterOption[];
  selectedValue: string;
  onChange: (value: string) => void;
}

function _FilterDropdown({
  icon,
  label,
  value,
  options,
  selectedValue,
  onChange,
}: FilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0, width: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const updatePosition = () => {
      if (buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect();
        const dropdownWidth = 200;
        const centerLeft = rect.left + rect.width / 2 - dropdownWidth / 2;
        const viewportWidth = window.innerWidth;
        const finalLeft = Math.max(
          8,
          Math.min(centerLeft, viewportWidth - dropdownWidth - 8),
        );
        setMenuPos({
          top: rect.bottom + 8,
          left: finalLeft,
          width: dropdownWidth,
        });
      }
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Element;
      if (
        !buttonRef.current?.contains(target) &&
        !menuRef.current?.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  return (
    <div className="relative flex-shrink-0">
      <motion.button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2.5 h-12 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-300 shadow-lg"
        whileTap={{ scale: 0.95 }}
      >
        <span className="text-base">{icon}</span>
        <span className="text-xs text-gray-400 font-medium">{label}:</span>
        <span className="font-bold text-white text-xs">{value}</span>
      </motion.button>

      {isOpen &&
        createPortal(
          <motion.div
            ref={menuRef}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              position: "fixed",
              top: menuPos.top,
              left: menuPos.left,
              width: menuPos.width,
            }}
            className="bg-slate-900 backdrop-blur-xl border border-white/20 rounded-xl shadow-2xl z-[99999] p-3"
          >
            <div className="flex flex-col gap-1.5">
              {options.map((option) => {
                const isActive = selectedValue === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      onChange(option.value);
                      setIsOpen(false);
                    }}
                    className={`text-sm px-4 py-3 rounded-lg font-bold transition-all duration-300 text-left ${isActive
                      ? "bg-emerald-500/20 border-2 border-emerald-400/50 shadow-lg"
                      : "bg-white/5 hover:bg-white/10 border border-white/10"
                      }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </motion.div>,
          document.body,
        )}
    </div>
  );
}

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

interface _Bank {
  id: string;
  name: string;
  totalBalance: number;
  accounts: Account[];
}

interface ExtendedAccount extends Account {
  paymentCycleStatus?: PaymentCycleStatus;
}

/**
 * Wallet view with card display and balance toggle
 * @implements BR-040 - Balance View Toggle
 * @satisfies US-013 - View Dashboard
 * @tested E2E
 */
export function WalletView({
  users: _users,
  accounts,
  activeUser,
  onActiveUserChange: _onActiveUserChange,
}: {
  users: User[];
  accounts: Account[];
  activeUser: string;
  onActiveUserChange?: (userId: string) => void;
}) {
  const [layout, setLayout] = useState("grid");
  const [balanceViewMode, setBalanceViewMode] = useState<
    "current" | "statement"
  >("current");
  const [activeBank, setActiveBank] = useState("all");
  const [paymentStatusFilter, _setPaymentStatusFilter] = useState<string | null>(
    null,
  );

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
      return result;
    });
  }, [userAccounts]);

  // 1. Filter by Bank first
  const accountsFilteredByBank = useMemo(() => {
    return activeBank === "all"
      ? userAccounts
      : userAccounts.filter((a) => a.bank === activeBank);
  }, [userAccounts, activeBank]);

  // 2. Calculate payment status counts based on bank-filtered accounts
  // This ensures counts show "what's available" even when a status filter is active
  const _paymentStatusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    accountsFilteredByBank.forEach((acc) => {
      const status = (acc as ExtendedAccount).paymentCycleStatus;
      if (status) {
        counts[status] = (counts[status] || 0) + 1;
      }
    });
    return counts;
  }, [accountsFilteredByBank]);

  // 3. Apply Payment Status Filter for the final list
  const filteredAccounts = useMemo(() => {
    if (!paymentStatusFilter) return accountsFilteredByBank;

    return accountsFilteredByBank.filter((a) => {
      const status = (a as ExtendedAccount).paymentCycleStatus;
      return status === paymentStatusFilter;
    });
  }, [accountsFilteredByBank, paymentStatusFilter]);

  const total = filteredAccounts.reduce((acc, cur) => acc + cur.balance, 0);

  return (
    <div className="space-y-8">
      {/* Hero Section: Total Balance */}
      <FadeIn>
        <div className="text-center space-y-2 pt-8 pb-4">
          <h2 className="text-slate-400 text-sm font-medium uppercase tracking-wider">
            Total Balance
          </h2>
          <div className="text-5xl md:text-6xl font-bold text-white tracking-tight">
            $
            {total.toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>
        </div>
      </FadeIn>

      {/* Bank Icons Row */}
      <FadeIn delay={0.1}>
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center justify-center gap-3 overflow-x-auto pb-2 max-w-full px-4 scrollbar-hide mask-fade-sides">
            {/* All Banks Button */}
            <button
              onClick={() => setActiveBank("all")}
              className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 ${activeBank === "all"
                ? "bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.3)] scale-110"
                : "bg-white/10 text-white hover:bg-white/20 border border-white/5"
                }`}
            >
              <List className="w-5 h-5" />
            </button>

            {/* Bank Icons */}
            {banks
              .filter((b) => b.name !== "all")
              .map((bank) => (
                <button
                  key={bank.name}
                  onClick={() => setActiveBank(bank.name)}
                  className={`relative w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 ${activeBank === bank.name
                    ? "ring-2 ring-white shadow-[0_0_20px_rgba(255,255,255,0.2)] scale-110 z-10"
                    : "opacity-70 hover:opacity-100 hover:scale-105 grayscale hover:grayscale-0"
                    }`}
                >
                  <div className="w-full h-full rounded-xl overflow-hidden bg-white/5 border border-white/10">
                    <BankLogo name={bank.name} bankId={bank.id} size="md" />
                  </div>
                </button>
              ))}
          </div>
          <div className="text-slate-500 text-sm font-medium">
            {activeBank === "all" ? "All Banks" : activeBank}
          </div>
        </div>
      </FadeIn>

      {/* Cards Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-4">
          <h3 className="text-lg font-bold text-white">Cards & Accounts</h3>
          <div className="flex items-center gap-2">
            {/* Balance View Toggle */}
            <div className="bg-white/5 p-1 rounded-lg flex gap-1 border border-white/10">
              <button
                onClick={() => setBalanceViewMode("current")}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${balanceViewMode === "current"
                  ? "bg-white/10 text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-300"
                  }`}
              >
                Current
              </button>
              <button
                onClick={() => setBalanceViewMode("statement")}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${balanceViewMode === "statement"
                  ? "bg-white/10 text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-300"
                  }`}
              >
                Stmt
              </button>
            </div>

            {/* Layout Toggle */}
            <div className="bg-white/5 p-1 rounded-lg flex gap-1 border border-white/10">
              <button
                onClick={() => setLayout("grid")}
                className={`p-2 rounded-md transition-all min-w-[40px] min-h-[40px] flex items-center justify-center ${layout === "grid"
                  ? "bg-white/10 text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-300"
                  }`}
                aria-label="Grid view"
              >
                <CreditCardIcon size={18} />
              </button>
              <button
                onClick={() => setLayout("list")}
                className={`p-2 rounded-md transition-all min-w-[40px] min-h-[40px] flex items-center justify-center ${layout === "list"
                  ? "bg-white/10 text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-300"
                  }`}
                aria-label="List view"
              >
                <List size={18} />
              </button>
            </div>
          </div>
        </div>

        <div
          className={`grid gap-4 px-2 ${layout === "grid" ? "grid-cols-1 sm:grid-cols-2 md:grid-cols-3" : "grid-cols-1"}`}
        >
          <AnimatePresence mode="popLayout">
            {filteredAccounts.map((acc, i) => (
              <FadeIn key={acc.id} delay={i * 0.05}>
                <CreditCard
                  acc={acc}
                  layout={layout}
                  balanceViewMode={balanceViewMode}
                />
              </FadeIn>
            ))}
          </AnimatePresence>
          {filteredAccounts.length === 0 && (
            <div className="text-center py-12 text-slate-500 col-span-full">
              <p>No accounts found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
