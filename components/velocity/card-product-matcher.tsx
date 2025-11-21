"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Search, CreditCard, Check } from "lucide-react";
import { toast } from "sonner";

interface CardProduct {
    id: string;
    issuer: string;
    productName: string;
    cardType: string | null;
    annualFee: number | null;
    imageUrl: string | null;
    benefits: Array<{
        id: string;
        benefitName: string;
    }>;
}

interface CardProductMatcherProps {
    isOpen: boolean;
    onClose: () => void;
    accountId: string;
    accountName: string;
    institutionName: string | null;
    currentProductId?: string | null;
    onSuccess: () => void;
}

export function CardProductMatcher({
    isOpen,
    onClose,
    accountId,
    accountName,
    institutionName,
    currentProductId,
    onSuccess
}: CardProductMatcherProps) {
    const [products, setProducts] = useState<CardProduct[]>([]);
    const [filteredProducts, setFilteredProducts] = useState<CardProduct[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchProducts();
        }
    }, [isOpen]);

    useEffect(() => {
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            setFilteredProducts(
                products.filter(p =>
                    p.issuer.toLowerCase().includes(query) ||
                    p.productName.toLowerCase().includes(query)
                )
            );
        } else {
            setFilteredProducts(products);
        }
    }, [searchQuery, products]);

    const fetchProducts = async () => {
        setLoading(true);
        try {
            // Filter by institution if available
            const url = institutionName
                ? `/api/card-products?issuer=${encodeURIComponent(institutionName)}`
                : '/api/card-products';

            const res = await fetch(url);
            if (res.ok) {
                const data = await res.json();
                setProducts(data);
                setFilteredProducts(data);
            }
        } catch (error) {
            toast.error('Failed to load card products');
        } finally {
            setLoading(false);
        }
    };

    const linkProduct = async (productId: string | null) => {
        setSaving(true);
        try {
            const res = await fetch(`/api/plaid/accounts/${accountId}/link-product`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cardProductId: productId })
            });

            if (res.ok) {
                toast.success(productId ? 'Card product linked' : 'Card product unlinked');
                onSuccess();
                onClose();
            } else {
                toast.error('Failed to link card product');
            }
        } catch (error) {
            toast.error('Error linking card product');
        } finally {
            setSaving(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                    />

                    {/* Modal */}
                    <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-dark-800 rounded-2xl border border-white/10 shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col"
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between p-6 border-b border-white/5">
                                <div>
                                    <h2 className="text-xl font-bold text-white">Link Card Product</h2>
                                    <p className="text-sm text-slate-400 mt-1">{accountName}</p>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="p-2 hover:bg-white/5 rounded-lg transition-colors"
                                >
                                    <X className="w-5 h-5 text-slate-400" />
                                </button>
                            </div>

                            {/* Search */}
                            <div className="p-4 border-b border-white/5">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="Search cards..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full pl-10 pr-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-brand-primary"
                                    />
                                </div>
                            </div>

                            {/* Products List */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-2">
                                {currentProductId && (
                                    <button
                                        onClick={() => linkProduct(null)}
                                        disabled={saving}
                                        className="w-full p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-left border border-white/10"
                                    >
                                        <p className="text-sm font-bold text-red-400">Unlink Current Card</p>
                                        <p className="text-xs text-slate-500 mt-1">Remove card product association</p>
                                    </button>
                                )}

                                {loading ? (
                                    <div className="flex justify-center py-8">
                                        <div className="w-6 h-6 border-2 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
                                    </div>
                                ) : filteredProducts.length === 0 ? (
                                    <div className="text-center py-8">
                                        <CreditCard className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                                        <p className="text-sm text-slate-400">
                                            {searchQuery ? 'No matching cards found' : 'No card products available'}
                                        </p>
                                    </div>
                                ) : (
                                    filteredProducts.map((product) => {
                                        const isSelected = currentProductId === product.id;
                                        return (
                                            <button
                                                key={product.id}
                                                onClick={() => linkProduct(product.id)}
                                                disabled={saving}
                                                className={`w-full p-3 rounded-lg transition-all text-left ${isSelected
                                                        ? 'bg-brand-primary/20 border-brand-primary'
                                                        : 'bg-white/5 hover:bg-white/10 border-white/10'
                                                    } border`}
                                            >
                                                <div className="flex items-start gap-3">
                                                    {product.imageUrl ? (
                                                        <img
                                                            src={product.imageUrl}
                                                            alt={product.productName}
                                                            className="w-12 h-12 rounded-lg object-cover"
                                                        />
                                                    ) : (
                                                        <div className="w-12 h-12 rounded-lg bg-white/5 flex items-center justify-center">
                                                            <CreditCard className="w-6 h-6 text-slate-400" />
                                                        </div>
                                                    )}
                                                    <div className="flex-1">
                                                        <div className="flex items-start justify-between">
                                                            <div>
                                                                <p className="text-sm font-bold text-white">
                                                                    {product.issuer} {product.productName}
                                                                </p>
                                                                <p className="text-xs text-slate-400 mt-0.5">
                                                                    {product.benefits.length} benefit{product.benefits.length !== 1 ? 's' : ''}
                                                                    {product.annualFee !== null && ` • $${product.annualFee}/year`}
                                                                </p>
                                                            </div>
                                                            {isSelected && (
                                                                <Check className="w-5 h-5 text-brand-primary flex-shrink-0" />
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </button>
                                        );
                                    })
                                )}
                            </div>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    );
}
