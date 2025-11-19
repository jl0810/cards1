"use client";

import { motion } from "framer-motion";
import { Search, ArrowUpRight } from "lucide-react";

const TRANSACTIONS = [
  { id: 1, merchant: 'Uber Eats', amount: 24.50, date: 'Today', cat: 'Dining' },
  { id: 2, merchant: 'Delta Air Lines', amount: 450.00, date: 'Yesterday', cat: 'Travel' },
  { id: 3, merchant: 'Netflix', amount: 15.99, date: 'Oct 22', cat: 'Sub' },
];

const FadeIn = ({ children, delay = 0 }: { children: React.ReactNode, delay?: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -10 }}
    transition={{ duration: 0.3, delay }}
  >
    {children}
  </motion.div>
);

export function ActivityView() {
  return (
    <div className="space-y-4 pb-24">
      <div className="sticky top-0 z-10">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="text-slate-400 w-4 h-4" />
          </div>
          <input type="text" className="block w-full pl-10 pr-3 py-3 bg-glass-200 border border-white/10 rounded-xl text-sm placeholder-slate-500 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all text-white" placeholder="Search transactions..." />
        </div>
      </div>
      <div className="space-y-2">
        {TRANSACTIONS.map((t, i) => (
          <FadeIn key={i} delay={i * 0.1}>
            <div className="flex items-center justify-between p-4 rounded-xl bg-glass-100 border border-white/5 hover:bg-glass-200 transition-colors cursor-pointer">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-glass-200 flex items-center justify-center text-slate-300">
                  <ArrowUpRight className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">{t.merchant}</p>
                  <p className="text-xs text-slate-500">{t.cat} • {t.date}</p>
                </div>
              </div>
              <p className="text-sm font-mono font-bold text-white">${t.amount.toFixed(2)}</p>
            </div>
          </FadeIn>
        ))}
      </div>
    </div>
  );
}
