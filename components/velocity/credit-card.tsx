"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Wifi, Landmark, Globe } from "lucide-react";
import { useBankBrand } from "@/hooks/use-bank-brand";

interface Account {
  id: string;
  userId: string;
  bank: string;
  bankId?: string | null;
  name: string;
  mask?: string;
  balance: number;
  due: string;
  type: string;
  color: string;
  liabilities: {
    apr: string;
    aprType: string;
    aprBalanceSubjectToApr: string;
    aprInterestChargeAmount: string;
    limit: string;
    min_due: string;
    last_statement: string;
    next_due_date: string;
    last_statement_date: string;
    last_payment_amount: string;
    last_payment_date: string;
    status: string;
  };
}

const LiabilityStat = ({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) => (
  <div className="bg-white/5 p-2 rounded-lg border border-white/5">
    <p className="text-[9px] text-slate-500 uppercase font-bold tracking-widest">{label}</p>
    <p className={`text-sm font-mono font-bold ${accent ? 'text-brand-accent' : 'text-white'}`}>
      {value || 'N/A'}
    </p>
  </div>
);

export function CreditCard({ acc, layout, onRename }: { acc: Account; layout: string; onRename?: (id: string, newName: string) => void }) {
  const [isFlipped, setIsFlipped] = useState(false);
  const { brand } = useBankBrand(acc.bankId || null);

  // Use brand color or fallback to acc.color
  const cardColor = brand?.brandColor || acc.color;

  // List view doesn't support flip
  if (layout === 'list') {
    return (
      <div className="flex items-center justify-between p-4 rounded-2xl bg-glass-200 border border-white/5 hover:bg-glass-300 transition-colors cursor-pointer">
        <div className="flex items-center gap-4">
          <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${acc.color} flex items-center justify-center text-[10px] font-bold shadow-md text-white`}>
            {acc.bank[0]}
          </div>
          <div>
            <p className="text-sm font-bold text-white">{acc.name}</p>
            <p className="text-xs text-slate-400">•••• 4291</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm font-mono font-bold text-white">${acc.balance.toLocaleString()}</p>
          <p className={`text-[10px] font-bold ${acc.due === 'Overdue' ? 'text-red-400' : 'text-slate-500'}`}>
            {acc.due === 'Overdue' ? 'Overdue' : acc.due === 'N/A' ? 'Due date unavailable' : `Due in ${acc.due}`}
          </p>
        </div>
      </div>
    );
  }

  // Grid View with Flip Interaction
  return (
    <div
      className="w-[350px] h-[220px] perspective-1000 group"
      onClick={() => setIsFlipped(!isFlipped)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setIsFlipped(!isFlipped);
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`${acc.name} ending in ${acc.mask || '4291'}. Double tap to flip for details.`}
    >
      <motion.div
        initial={false}
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.6, type: "spring", stiffness: 260, damping: 20 }}
        className="w-full h-full relative transform-style-3d cursor-pointer"
        style={{ transformStyle: 'preserve-3d' }}
      >
        {/* --- FRONT OF CARD --- */}
        <div
          className="absolute inset-0 w-full h-full backface-hidden rounded-2xl overflow-hidden shadow-2xl"
          style={{ zIndex: isFlipped ? 0 : 1 }}
        >
          {/* Background with brand color or gradient */}
          <div
            className="absolute inset-0"
            style={{
              background: brand?.brandColor
                ? `linear-gradient(135deg, ${brand.brandColor} 0%, ${brand.brandColor}dd 100%)`
                : `linear-gradient(to bottom right, ${acc.color})`
            }}
          />
          {/* Noise texture overlay */}
          <div className="absolute inset-0 opacity-20 mix-blend-overlay bg-no-repeat bg-cover" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}></div>

          <div className="relative z-10 p-6 flex flex-col justify-between h-full">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-2">
                {/* Bank Logo or Icon */}
                {brand?.logoUrl ? (
                  <div className="w-10 h-10 bg-white rounded-lg p-1.5 flex items-center justify-center">
                    <img src={brand.logoUrl} alt={acc.bank} className="w-full h-full object-contain" />
                  </div>
                ) : acc.type === 'Amex' ? (
                  <Globe className="w-5 h-5 opacity-80 text-white" />
                ) : (
                  <Landmark className="w-5 h-5 opacity-80 text-white" />
                )}
                <span className="text-xs font-bold tracking-widest uppercase opacity-70 text-white">{acc.bank}</span>
              </div>
              {acc.due && acc.due !== 'N/A' && (
                <div className={`text-[10px] font-bold px-2 py-1 rounded backdrop-blur-md ${acc.due === 'Overdue' ? 'bg-red-500/20 text-red-200' : 'bg-white/20 text-white'}`}>
                  {acc.due === 'Overdue' ? 'Due Now' : acc.due}
                </div>
              )}
            </div>

            <div>
              <div className="flex gap-3 mb-4 opacity-60">
                <div className="w-10 h-7 rounded bg-yellow-500/20 border border-yellow-500/40"></div>
                <Wifi className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-3xl font-mono font-bold tracking-tight mb-1 text-white">
                ${acc.balance.toLocaleString()}
              </h3>
              <div className="flex justify-between items-end text-xs opacity-60 font-mono text-white">
                <span>•••• 4291</span>
                <span>EXP 09/28</span>
              </div>
            </div>
          </div>
        </div>

        {/* --- BACK OF CARD (Liabilities Data) --- */}
        <div
          className="absolute inset-0 w-full h-full backface-hidden rounded-2xl overflow-hidden bg-slate-900 border border-white/10 shadow-2xl"
          style={{ transform: 'rotateY(180deg)', zIndex: isFlipped ? 1 : 0 }}
        >
          <div className="w-full h-10 bg-black mt-4 mb-3"></div>
          <div className="px-6 flex gap-4 mb-4 items-center">
            <div className="flex-1 h-8 bg-white/10 rounded flex items-center px-3">
              <span className="text-[10px] font-serif text-white/50 italic transform -rotate-1">Authorized Signature</span>
            </div>
            <div className="w-12 h-8 bg-white/10 rounded flex items-center justify-center">
              <span className="text-xs font-mono font-bold text-white/90">923</span>
            </div>
          </div>

          <div className="px-6 pb-4 flex flex-col h-full">
            <div className="grid grid-cols-2 gap-3">
              <LiabilityStat label="Min Payment" value={acc.liabilities.min_due} />
              <LiabilityStat label="Statement Bal" value={acc.liabilities.last_statement} />
              <LiabilityStat label="APR" value={`${acc.liabilities.apr}${acc.liabilities.aprType && acc.liabilities.aprType !== 'N/A' ? ` • ${acc.liabilities.aprType}` : ''}`} accent />
              <LiabilityStat label="Limit" value={acc.liabilities.limit} />
            </div>

            <div className="mt-auto pt-2 flex items-center justify-between text-[10px] text-slate-400 border-t border-white/5">
              <div className="flex items-center gap-2">
                <span>Status:</span>
                <span className={`px-2 py-0.5 rounded-full font-bold ${acc.liabilities.status === 'Overdue' ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                  {acc.liabilities.status || 'Active'}
                </span>
              </div>
              <div className="font-mono">
                Due: <span className="text-white">{acc.liabilities.next_due_date || 'N/A'}</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
