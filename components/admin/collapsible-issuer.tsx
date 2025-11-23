"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Layers, RefreshCw } from "lucide-react";
import { useBankBrand } from "@/hooks/use-bank-brand";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface CollapsibleIssuerProps {
    issuer: string;
    bankId?: string | null;
    count: number;
    children: React.ReactNode;
    defaultOpen?: boolean;
    onRefresh?: () => void;
}

export function CollapsibleIssuer({ issuer, bankId, count, children, defaultOpen = false, onRefresh }: CollapsibleIssuerProps) {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const { brand } = useBankBrand(bankId || null);

    const handleRefresh = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!bankId) {
            toast.error('No bank ID available');
            return;
        }

        setIsRefreshing(true);
        try {
            const res = await fetch('/api/admin/banks/refresh', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ bankId }),
            });

            if (!res.ok) throw new Error('Failed to refresh');

            toast.success('Bank branding refreshed');
            onRefresh?.();
        } catch (error) {
            console.error(error);
            toast.error('Failed to refresh branding');
        } finally {
            setIsRefreshing(false);
        }
    };

    return (
        <div className="mb-3 rounded-xl bg-slate-900/50 border border-white/5 overflow-hidden">
            {/* Header / Trigger */}
            <div
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors cursor-pointer"
            >
                <div className="flex items-center gap-4">
                    {/* Logo */}
                    <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center p-1 shadow-sm overflow-hidden">
                        {brand?.logoUrl ? (
                            <img src={brand.logoUrl} alt={issuer} className="w-full h-full object-contain" />
                        ) : (
                            <div
                                className="w-full h-full flex items-center justify-center rounded-full"
                                style={{ backgroundColor: brand?.brandColor || undefined }}
                            >
                                <Layers className="w-5 h-5 text-slate-400" />
                            </div>
                        )}
                    </div>

                    {/* Text */}
                    <div className="text-left">
                        <h3 className="font-bold text-white text-lg leading-none">{issuer}</h3>
                        <p className="text-xs text-slate-400 mt-1">{count} Cards</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* Refresh Button */}
                    {bankId && (
                        <button
                            onClick={handleRefresh}
                            disabled={isRefreshing}
                            className="p-2 rounded-full hover:bg-white/10 transition-colors disabled:opacity-50"
                            title="Refresh bank branding"
                        >
                            <RefreshCw className={cn("w-4 h-4 text-slate-400", isRefreshing && "animate-spin")} />
                        </button>
                    )}

                    {/* Chevron */}
                    <div className={cn("p-2 rounded-full bg-white/5 transition-transform duration-200", isOpen && "rotate-180")}>
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                    </div>
                </div>
            </div>

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
