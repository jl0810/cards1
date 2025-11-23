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

const CardChip = () => (
  <div className="w-9 h-7 rounded-md bg-gradient-to-br from-[#e2e2e2] via-[#9ca3af] to-[#4b5563] relative overflow-hidden shadow-sm border border-[#6b7280]">
    {/* Chip Details */}
    <div className="absolute inset-0 opacity-50 mix-blend-multiply">
      {/* Center horizontal line */}
      <div className="absolute top-1/2 left-0 w-full h-[1px] bg-[#374151]"></div>
      {/* Center vertical line */}
      <div className="absolute top-0 left-1/2 h-full w-[1px] bg-[#374151]"></div>
      {/* Center rectangle */}
      <div className="absolute top-1/2 left-1/2 w-3 h-2 border border-[#374151] -translate-x-1/2 -translate-y-1/2 rounded-[1px]"></div>
      {/* Corner curves */}
      <div className="absolute bottom-0 left-0 w-2.5 h-2.5 border-t border-r border-[#374151] rounded-tr-md"></div>
      <div className="absolute bottom-0 right-0 w-2.5 h-2.5 border-t border-l border-[#374151] rounded-tl-md"></div>
      <div className="absolute top-0 left-0 w-2.5 h-2.5 border-b border-r border-[#374151] rounded-br-md"></div>
      <div className="absolute top-0 right-0 w-2.5 h-2.5 border-b border-l border-[#374151] rounded-bl-md"></div>
    </div>
    {/* Specular Highlight */}
    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/30 to-transparent opacity-40 pointer-events-none"></div>
  </div>
);

const NetworkLogo = ({ type }: { type: string }) => {
  const typeLower = type.toLowerCase();
  if (typeLower.includes('visa')) {
    return (
      <div className="font-bold text-white italic text-2xl tracking-tighter relative">
        VISA
        <div className="absolute -top-1 -right-2 text-[6px] not-italic font-sans opacity-70">DEBIT</div>
      </div>
    );
  }
  if (typeLower.includes('mastercard')) {
    return (
      <div className="flex -space-x-3 opacity-90">
        <div className="w-8 h-8 rounded-full bg-red-500/90 mix-blend-screen"></div>
        <div className="w-8 h-8 rounded-full bg-yellow-500/90 mix-blend-screen"></div>
      </div>
    );
  }
  if (typeLower.includes('amex') || typeLower.includes('american')) {
    return (
      <div className="bg-[#006fcf] w-10 h-10 rounded flex items-center justify-center border border-white/20">
        <span className="text-white font-bold text-[8px] text-center leading-none">AMERICAN<br/>EXPRESS</span>
      </div>
    );
  }
  return null; // Fallback or empty
};

// Standard brand colors for "Real Card" feel
const BANK_COLORS: Record<string, string> = {
  'Chase': '#117aca',
  'JPMorgan Chase': '#117aca',
  'Citi': '#003b70', 
  'Citibank': '#003b70',
  'Citibank Online': '#003b70',
  'Wells Fargo': '#cd1409',
  'Bank of America': '#012169',
  'Capital One': '#00497b',
  'American Express': '#444444', // Generic Amex Dark
  'Amex': '#444444',
  'Discover': '#f96f22',
  'US Bank': '#0c2074',
  'PNC': '#f47920',
  'Navy Federal': '#0f3a68',
  'Barclays': '#00aeef',
};

export function CreditCard({ acc, layout, onRename }: { acc: Account; layout: string; onRename?: (id: string, newName: string) => void }) {
  const [isFlipped, setIsFlipped] = useState(false);
  const { brand } = useBankBrand(acc.bankId || null);

  // Resolve Color: Database -> Manual Map -> Fallback
  const knownColor = Object.keys(BANK_COLORS).find(key => acc.bank.includes(key)) ? BANK_COLORS[Object.keys(BANK_COLORS).find(key => acc.bank.includes(key)) as string] : null;
  const brandColor = brand?.brandColor || knownColor || null;

  // List view doesn't support flip
  if (layout === 'list') {
    return (
      <div className="flex items-center justify-between p-4 rounded-2xl bg-glass-200 border border-white/5 hover:bg-glass-300 transition-colors cursor-pointer">
        <div className="flex items-center gap-4">
          <div 
            className="w-10 h-10 rounded-full flex items-center justify-center text-[10px] font-bold shadow-md text-white"
            style={{ background: brandColor ? `linear-gradient(135deg, ${brandColor}, #1a1a1a)` : `linear-gradient(to bottom right, ${acc.color})` }}
          >
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
      className="w-[360px] h-[225px] perspective-1000 group mx-auto"
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
          {/* Base Background - Dark Premium Feel */}
          <div
            className="absolute inset-0 bg-[#1a1a1a]"
            style={{
                background: brandColor
                  ? `linear-gradient(110deg, ${brandColor} 0%, ${brandColor}cc 60%, #1a1a1a 100%)`
                  : `linear-gradient(135deg, #2c2c2c 0%, #1a1a1a 100%)`
            }}
          />
          
          {/* Texture Overlay (Noise) */}
          <div className="absolute inset-0 opacity-[0.15] mix-blend-overlay bg-no-repeat bg-cover pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}></div>
          
          {/* Metallic Sheen/Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-black/40 opacity-50 pointer-events-none"></div>

          <div className="relative z-10 p-6 flex flex-col justify-between h-full">
            {/* Top Row: Bank Name/Logo */}
            <div className="flex justify-between items-start w-full">
              <div className="flex items-center">
                {/* Bank Logo - "Silver Foil" Effect (High-Contrast Stencil) */}
                {brand?.logoUrl ? (
                  <div className="h-12 flex items-center justify-start mix-blend-screen">
                    <img 
                      src={brand.logoUrl} 
                      alt={acc.bank} 
                      className="h-full w-auto max-w-[200px] object-contain"
                      style={{ filter: 'grayscale(100%) brightness(1.1) contrast(500%) invert(100%)' }}
                    />
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    {acc.type === 'Amex' ? (
                      <Globe className="w-6 h-6 opacity-90 text-white" />
                    ) : (
                      <Landmark className="w-6 h-6 opacity-90 text-white" />
                    )}
                    <span className="text-sm font-bold tracking-widest uppercase text-white/90 drop-shadow-md font-sans">{acc.bank}</span>
                  </div>
                )}
              </div>
              
              {/* Optional: Status Badge (Subtle) */}
              {acc.due === 'Overdue' && (
                <div className="px-2 py-0.5 rounded bg-red-500/20 border border-red-500/30 text-red-200 text-[9px] font-bold uppercase tracking-wider shadow-sm backdrop-blur-md">
                  Overdue
                </div>
              )}
            </div>

            {/* Middle Row: Chip & Contactless */}
            <div className="flex items-center gap-4 mt-2">
              <CardChip />
              <Wifi className="w-5 h-5 text-white/60 rotate-90" strokeWidth={2.5} />
            </div>

            {/* Bottom Area: Balance & Card Details */}
            <div className="mt-auto space-y-4">
              {/* Balance - Big & Bold */}
              <div className="space-y-0.5">
                <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Current Balance</p>
                <h3 className="text-3xl font-mono font-bold tracking-tighter text-white drop-shadow-lg">
                  ${acc.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </h3>
              </div>

              <div className="flex justify-between items-end">
                {/* Card Number & Name */}
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2 font-mono text-white/80 text-sm tracking-widest">
                    <span className="text-[10px] align-middle">••••</span>
                    <span>{acc.mask || '4291'}</span>
                  </div>
                  <p className="text-[10px] font-medium text-white/50 uppercase tracking-wider">{acc.name}</p>
                </div>

                {/* Expiry or Network Logo */}
                <div className="flex flex-col items-end gap-1">
                   <span className="font-mono text-[9px] text-white/60">EXP 09/28</span>
                   <div className="opacity-80 grayscale-[0.3]">
                     <NetworkLogo type={acc.type || acc.bank} />
                   </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* --- BACK OF CARD (Liabilities Data) --- */}
        <div
          className="absolute inset-0 w-full h-full backface-hidden rounded-2xl overflow-hidden bg-slate-900 border border-white/10 shadow-2xl"
          style={{ transform: 'rotateY(180deg)', zIndex: isFlipped ? 1 : 0 }}
        >
          <div className="w-full h-10 bg-black mt-5 mb-4 relative">
             <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-20"></div>
          </div>
          
          <div className="px-6 flex gap-4 mb-5 items-center">
            <div className="flex-1 h-9 bg-white/10 rounded-sm flex items-center px-3 relative overflow-hidden">
               {/* Signature Pattern */}
               <div className="absolute inset-0 opacity-10" style={{backgroundImage: 'repeating-linear-gradient(45deg, #fff 0, #fff 1px, transparent 0, transparent 50%)', backgroundSize: '6px 6px'}}></div>
              <span className="text-[10px] font-serif text-white/60 italic relative z-10">Authorized Signature</span>
            </div>
            <div className="w-12 h-9 bg-white/10 rounded-sm flex items-center justify-center border border-white/5">
              <span className="text-sm font-mono font-bold text-white/90 italic">923</span>
            </div>
          </div>

          <div className="px-6 pb-6 flex flex-col h-full flex-1">
            <div className="grid grid-cols-2 gap-3 mb-2">
              <LiabilityStat label="Min Payment" value={acc.liabilities.min_due} />
              <LiabilityStat label="Statement Bal" value={acc.liabilities.last_statement} />
              <LiabilityStat label="APR" value={`${acc.liabilities.apr}${acc.liabilities.aprType && acc.liabilities.aprType !== 'N/A' ? ` • ${acc.liabilities.aprType}` : ''}`} accent />
              <LiabilityStat label="Limit" value={acc.liabilities.limit} />
            </div>

            <div className="mt-auto pt-3 flex items-center justify-between text-[10px] text-slate-400 border-t border-white/5">
              <div className="flex items-center gap-2">
                <span>Status:</span>
                <span className={`px-2 py-0.5 rounded-full font-bold uppercase tracking-wider text-[9px] ${acc.liabilities.status === 'Overdue' ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
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
