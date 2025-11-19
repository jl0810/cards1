"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Wifi, Landmark, Globe } from "lucide-react";

interface Account {
  id: string;
  userId: string;
  bank: string;
  name: string;
  balance: number;
  due: string;
  type: string;
  color: string;
  liabilities: {
    apr: string;
    limit: string;
    min_due: string;
    last_statement: string;
  };
}

export function CreditCard({ acc, layout }: { acc: Account; layout: string }) {
  const [isFlipped, setIsFlipped] = useState(false);

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
            {acc.due === 'Overdue' ? 'Overdue' : `Due in ${acc.due}`}
          </p>
        </div>
      </div>
    );
  }

  // Grid View with Flip Interaction
  return (
    <div className="h-56 w-full perspective-1000 group" onClick={() => setIsFlipped(!isFlipped)}>
      <motion.div
        initial={false}
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.6, type: "spring", stiffness: 260, damping: 20 }}
        className="w-full h-full relative transform-style-3d cursor-pointer"
        style={{ transformStyle: 'preserve-3d' }}
      >
        {/* --- FRONT OF CARD --- */}
        <div className="absolute inset-0 w-full h-full backface-hidden rounded-2xl overflow-hidden shadow-2xl">
          <div className={`absolute inset-0 bg-gradient-to-br ${acc.color} opacity-90`} />
          {/* Noise texture overlay */}
          <div className="absolute inset-0 opacity-20 mix-blend-overlay bg-no-repeat bg-cover" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}></div>
          
          <div className="relative z-10 p-6 flex flex-col justify-between h-full">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-2">
                {acc.type === 'Amex' ? <Globe className={`w-5 h-5 opacity-80 ${acc.type === 'Amex' ? 'text-black' : 'text-white'}`} /> : <Landmark className={`w-5 h-5 opacity-80 ${acc.type === 'Amex' ? 'text-black' : 'text-white'}`} />}
                <span className={`text-xs font-bold tracking-widest uppercase opacity-70 ${acc.type === 'Amex' ? 'text-black' : 'text-white'}`}>{acc.bank}</span>
              </div>
              <div className={`text-[10px] font-bold px-2 py-1 rounded backdrop-blur-md ${acc.due === 'Overdue' ? 'bg-red-500/20 text-red-800' : 'bg-white/20 text-white'}`}>
                {acc.due === 'Overdue' ? 'Due Now' : acc.due}
              </div>
            </div>

            <div>
              <div className="flex gap-3 mb-4 opacity-60">
                <div className="w-10 h-7 rounded bg-yellow-500/20 border border-yellow-500/40"></div>
                <Wifi className={`w-6 h-6 ${acc.type === 'Amex' ? 'text-black' : 'text-white'}`} />
              </div>
              <h3 className={`text-3xl font-mono font-bold tracking-tight mb-1 ${acc.type === 'Amex' ? 'text-black' : 'text-white'}`}>
                ${acc.balance.toLocaleString()}
              </h3>
              <div className={`flex justify-between items-end text-xs opacity-60 font-mono ${acc.type === 'Amex' ? 'text-black' : 'text-white'}`}>
                <span>•••• 4291</span>
                <span>EXP 09/28</span>
              </div>
            </div>
          </div>
        </div>

        {/* --- BACK OF CARD (Liabilities Data) --- */}
        <div className="absolute inset-0 w-full h-full backface-hidden rounded-2xl overflow-hidden bg-dark-800 border border-white/10 shadow-2xl rotate-y-180">
          <div className="w-full h-10 bg-black mt-4 mb-4"></div>
          <div className="px-6 flex gap-4 mb-4">
            <div className="flex-1 h-8 bg-white/10 rounded flex items-center px-2">
              <span className="text-[10px] font-serif text-white/50 italic transform -rotate-2">Authorized Signature</span>
            </div>
            <div className="w-12 h-8 bg-white/10 rounded flex items-center justify-center">
              <span className="text-xs font-mono font-bold text-white/70">923</span>
            </div>
          </div>
          <div className="px-6 pb-6 grid grid-cols-2 gap-3">
            <div className="bg-white/5 p-2 rounded-lg">
              <p className="text-[9px] text-slate-500 uppercase font-bold">Min Payment</p>
              <p className="text-sm font-mono font-bold text-white">{acc.liabilities.min_due}</p>
            </div>
            <div className="bg-white/5 p-2 rounded-lg">
              <p className="text-[9px] text-slate-500 uppercase font-bold">Statement Bal</p>
              <p className="text-sm font-mono font-bold text-white">{acc.liabilities.last_statement}</p>
            </div>
            <div className="bg-white/5 p-2 rounded-lg">
              <p className="text-[9px] text-slate-500 uppercase font-bold">Purchase APR</p>
              <p className="text-sm font-mono font-bold text-brand-accent">{acc.liabilities.apr}</p>
            </div>
            <div className="bg-white/5 p-2 rounded-lg">
              <p className="text-[9px] text-slate-500 uppercase font-bold">Credit Limit</p>
              <p className="text-sm font-mono font-bold text-white">{acc.liabilities.limit}</p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
