"use client";

import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

import { BenefitSchema, ProductSchema } from "@/lib/validations";
import type { z } from "zod";

type Benefit = z.infer<typeof BenefitSchema>;
type Product = z.infer<typeof ProductSchema>;

interface ProductRowProps {
    product: Product;
    onEdit: (id: string) => void;
}

export function ProductRow({ product, onEdit }: ProductRowProps) {
    const draftCount = product.benefits.filter((b: Benefit) => !b.isApproved).length;

    return (
        <div
            onClick={() => onEdit(product.id)}
            className="group flex items-center justify-between p-3 hover:bg-white/5 border-b border-white/5 last:border-0 cursor-pointer transition-colors"
        >
            {/* Left: Icon & Info */}
            <div className="flex items-center gap-3 overflow-hidden">
                {/* Thumbnail */}
                <div className="w-10 h-6 rounded bg-slate-800 border border-white/10 flex-shrink-0 overflow-hidden relative">
                    {product.imageUrl ? (
                        <img src={product.imageUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full bg-gradient-to-br from-slate-700 to-slate-800" />
                    )}
                </div>

                {/* Text Info */}
                <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-slate-200 truncate max-w-[150px] sm:max-w-[300px]">
                            {product.productName}
                        </span>
                        {draftCount > 0 && (
                            <span className="px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-bold border border-amber-500/20">
                                {draftCount}
                            </span>
                        )}
                    </div>
                    <span className="text-xs text-slate-500 truncate">
                        {product.cardType || "Credit Card"} • ${product.annualFee || 0}/yr
                    </span>
                </div>
            </div>

            {/* Right: Status & Chevron */}
            <div className="flex items-center gap-3 flex-shrink-0 ml-2">
                {/* Status Dot */}
                <div className={cn("w-2 h-2 rounded-full", product.active ? "bg-green-400" : "bg-slate-600")} />

                <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-colors" />
            </div>
        </div>
    );
}
