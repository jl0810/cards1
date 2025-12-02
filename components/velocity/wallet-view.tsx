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

function FilterDropdown({
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
                    className={`text-sm px-4 py-3 rounded-lg font-bold transition-all duration-300 text-left ${
                      isActive
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

interface Bank {
  id: string;
  name: string;
  totalBalance: number;
  accounts: Account[];
}

interface ExtendedAccount extends Account {
  paymentCycleStatus?: PaymentCycleStatus;
}

export function WalletView({
  users,
  accounts,
  activeUser,
  onActiveUserChange,
}: {
  users: User[];
  accounts: Account[];
  activeUser: string;
  onActiveUserChange?: (userId: string) => void;
}) {
  const [layout, setLayout] = useState("grid");
  const [activeBank, setActiveBank] = useState("all");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string | null>(
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
  const paymentStatusCounts = useMemo(() => {
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
    <div className="space-y-6">
      <FadeIn>
        <h2 className="text-xl font-bold text-white px-4 flex items-center gap-2">
          <CreditCardIcon className="w-5 h-5 text-emerald-400" />
          Your Wallet
        </h2>
      </FadeIn>

      {/* Filter Bar - FakeSharp Style */}
      <div className="flex items-center gap-2 px-4 pb-4 overflow-x-auto scrollbar-hide">
        {/* Family Filter */}
        <FilterDropdown
          icon="👥"
          label="Family"
          value={users.find((u) => u.id === activeUser)?.name || "All"}
          options={[
            { value: "all", label: "All" },
            ...users.map((u) => ({ value: u.id, label: u.name })),
          ]}
          selectedValue={activeUser}
          onChange={(val: string) => onActiveUserChange?.(val)}
        />

        {/* Bank Filter */}
        <FilterDropdown
          icon="🏦"
          label="Bank"
          value={activeBank === "all" ? "All" : activeBank}
          options={[
            { value: "all", label: "All" },
            ...banks
              .filter((b) => b.name !== "all")
              .map((b) => ({ value: b.name, label: b.name })),
          ]}
          selectedValue={activeBank}
          onChange={setActiveBank}
        />

        {/* Status Filter */}
        <FilterDropdown
          icon="📊"
          label="Status"
          value={
            paymentStatusFilter === "STATEMENT_GENERATED"
              ? "Due"
              : paymentStatusFilter === "PAID_AWAITING_STATEMENT"
                ? "Paid"
                : paymentStatusFilter === "OVERDUE"
                  ? "Late"
                  : "All"
          }
          options={[
            { value: "all", label: "All" },
            {
              value: "STATEMENT_GENERATED",
              label: `🔴 Due (${paymentStatusCounts["STATEMENT_GENERATED"] || 0})`,
            },
            {
              value: "PAID_AWAITING_STATEMENT",
              label: `✅ Paid (${paymentStatusCounts["PAID_AWAITING_STATEMENT"] || 0})`,
            },
            {
              value: "OVERDUE",
              label: `⚠️ Late (${paymentStatusCounts["OVERDUE"] || 0})`,
            },
          ]}
          selectedValue={paymentStatusFilter || "all"}
          onChange={(val: string) =>
            setPaymentStatusFilter(
              val === "all" ? null : (val as PaymentCycleStatus),
            )
          }
        />
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
