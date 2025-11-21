"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Layers } from "lucide-react";
import { useBankLogo } from "@/hooks/use-bank-logo";
import { cn } from "@/lib/utils";

interface CollapsibleIssuerProps {
    issuer: string;
    count: number;
    children: React.ReactNode;
    defaultOpen?: boolean;
}

export function CollapsibleIssuer({ issuer, count, children, defaultOpen = false }: CollapsibleIssuerProps) {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    const logoUrl = useBankLogo(issuer, { size: 64, format: 'png' });

    return (
        <div className="mb-3 rounded-xl bg-slate-900/50 border border-white/5 overflow-hidden">
            {/* Header / Trigger */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
            >
                <div className="flex items-center gap-4">
                    {/* Logo */}
                    <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center p-1 shadow-sm overflow-hidden">
                        {logoUrl ? (
                            <img src={logoUrl} alt={issuer} className="w-full h-full object-contain" />
                        ) : (
                            <Layers className="w-5 h-5 text-slate-400" />
                        )}
                    </div>

                    {/* Text */}
                    <div className="text-left">
                        <h3 className="font-bold text-white text-lg leading-none">{issuer}</h3>
                        <p className="text-xs text-slate-400 mt-1">{count} Cards</p>
                    </div>
                </div>

                {/* Chevron */}
                <div className={cn("p-2 rounded-full bg-white/5 transition-transform duration-200", isOpen && "rotate-180")}>
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                </div>
            </button>

            {/* Content / Accordion Body */}
            <AnimatePresence initial={false}>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                    >
                        <div className="border-t border-white/5 bg-black/20">
                            {children}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
