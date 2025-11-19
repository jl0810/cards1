"use client";

import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CreditCard as CreditCardIcon, List } from "lucide-react";
import { CreditCard } from "./credit-card";

// Helper for animation
const FadeIn = ({ children, delay = 0, className }: { children: React.ReactNode, delay?: number, className?: string }) => (
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

export function WalletView({ users, accounts, activeUser }: { users: any[], accounts: any[], activeUser: string }) {
  const [layout, setLayout] = useState('grid');
  const [activeBank, setActiveBank] = useState('all');

  useEffect(() => { setActiveBank('all'); }, [activeUser]);

  const userAccounts = useMemo(() => activeUser === 'all' ? accounts : accounts.filter(a => a.userId === activeUser), [activeUser, accounts]);
  const banks = useMemo(() => ['all', ...new Set(userAccounts.map(a => a.bank))], [userAccounts]);
  const filteredAccounts = useMemo(() => activeBank === 'all' ? userAccounts : userAccounts.filter(a => a.bank === activeBank), [userAccounts, activeBank]);
  const total = filteredAccounts.reduce((acc, cur) => acc + cur.balance, 0);

  return (
    <div className="space-y-6 pb-24">
      <FadeIn className="text-center py-4">
        <p className="text-sm text-slate-400 font-medium mb-1">Total Balance</p>
        <h2 className="text-5xl font-bold text-white tracking-tighter">${total.toLocaleString('en-US', { minimumFractionDigits: 2 })}</h2>
      </FadeIn>

      <div className="flex justify-center">
        <div className="flex gap-2 overflow-x-auto no-scrollbar px-4 py-1 bg-glass-100 rounded-full border border-white/5 max-w-full">
          {banks.map((bank: any) => (
            <button key={bank} onClick={() => setActiveBank(bank)} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all capitalize whitespace-nowrap ${activeBank === bank ? 'bg-white text-black shadow-lg' : 'text-slate-400 hover:text-white'}`}>
              {bank}
            </button>
          ))}
        </div>
      </div>

      <div className="flex justify-between items-center px-1">
        <h3 className="text-sm font-bold text-slate-300">Cards & Accounts</h3>
        <div className="bg-glass-200 p-1 rounded-lg flex gap-1">
          <button onClick={() => setLayout('grid')} className={`p-1.5 rounded-md transition-all ${layout === 'grid' ? 'bg-white/10 text-white' : 'text-slate-500'}`}><CreditCardIcon size={18} /></button>
          <button onClick={() => setLayout('list')} className={`p-1.5 rounded-md transition-all ${layout === 'list' ? 'bg-white/10 text-white' : 'text-slate-500'}`}><List size={18} /></button>
        </div>
      </div>

      <div className={`grid gap-4 ${layout === 'grid' ? 'grid-cols-1' : 'grid-cols-1'}`}>
        <AnimatePresence>
          {filteredAccounts.map((acc, i) => (
            <FadeIn key={acc.id} delay={i * 0.05}>
              <CreditCard acc={acc} layout={layout} />
            </FadeIn>
          ))}
        </AnimatePresence>
        {filteredAccounts.length === 0 && (
          <div className="text-center py-10 text-slate-500"><p>No accounts found</p></div>
        )}
      </div>
    </div>
  );
}
