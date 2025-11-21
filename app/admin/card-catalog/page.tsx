"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useIsAdmin } from '@/hooks/use-admin';
import { Plus, Sparkles, CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import { AddProductModal } from '@/components/admin/add-product-modal';
import { ProductDrawer } from '@/components/admin/product-drawer';
import { AIImportModal } from '@/components/admin/ai-import-modal';
import { CollapsibleIssuer } from '@/components/admin/collapsible-issuer';
import { ProductRow } from '@/components/admin/product-row';
import { motion, AnimatePresence } from 'framer-motion';
import { AppHeader } from '@/components/layout/app-header';
import { NavDock } from '@/components/layout/nav-dock';

interface CardBenefit {
    id: string;
    benefitName: string;
    timing: string;
    maxAmount: number | null;
    keywords: string[];
    active: boolean;
    isApproved: boolean;
}

interface CardProduct {
    id: string;
    issuer: string;
    productName: string;
    cardType: string | null;
    annualFee: number | null;
    signupBonus: string | null;
    imageUrl: string | null;
    active: boolean;
    benefits: CardBenefit[];
    _count: {
        accountExtensions: number;
    };
}

export default function AdminCardCatalogPage() {
    const router = useRouter();
    const isAdmin = useIsAdmin();
    const [products, setProducts] = useState<CardProduct[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAddingProduct, setIsAddingProduct] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [isAIImportOpen, setIsAIImportOpen] = useState(false);
    const [editingProductId, setEditingProductId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        if (isAdmin === false) {
            router.push('/dashboard');
        }
    }, [isAdmin, router]);

    useEffect(() => {
        if (isAdmin) {
            fetchProducts();
        }
    }, [isAdmin]);

    const fetchProducts = async () => {
        try {
            const res = await fetch('/api/admin/card-catalog');
            if (!res.ok) throw new Error('Failed to fetch products');
            const data = await res.json();
            setProducts(data);
        } catch (error) {
            console.error(error);
            toast.error('Failed to load products');
        } finally {
            setLoading(false);
        }
    };

    const startAIImport = async (issuer: string) => {
        setIsImporting(true);
        setIsAIImportOpen(false); // Close modal

        const toastId = toast.loading(`Starting AI import for ${issuer}...`);

        try {
            const res = await fetch('/api/admin/card-catalog/ai-import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ issuer })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Import failed');
            }

            toast.success(`Successfully imported/updated ${data.imported} cards!`, { id: toastId });
            fetchProducts();
        } catch (error: any) {
            console.error('AI Import error:', error);
            toast.error(error.message || 'Failed to import cards', { id: toastId });
        } finally {
            setIsImporting(false);
        }
    };

    const deleteProduct = async (id: string) => {
        // Confirmation is handled by the ProductDrawer now
        try {
            const res = await fetch(`/api/admin/card-catalog/${id}`, {
                method: 'DELETE'
            });
            if (!res.ok) throw new Error('Failed to delete');
            toast.success('Product deleted');
            fetchProducts();
        } catch (error) {
            console.error(error);
            toast.error('Failed to delete product');
        }
    };

    // Filter products
    const filteredProducts = products.filter(p =>
        p.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.issuer.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Group products by issuer
    const issuers = Array.from(new Set(filteredProducts.map(p => p.issuer))).sort();
    const groupedProducts = issuers.map(issuer => ({
        issuer,
        products: filteredProducts.filter(p => p.issuer === issuer)
    }));

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-brand-primary"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 text-white pb-20">
            <AppHeader />

            <div className="p-4 md:p-6 max-w-3xl mx-auto">
                {/* Header */}
                <div className="flex flex-col gap-4 mb-6">
                    <div className="flex items-center justify-between">
                        <h1 className="text-2xl font-bold text-white">Card Catalog</h1>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setIsAIImportOpen(true)}
                                disabled={isImporting}
                                className="p-2 bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 rounded-lg transition-colors"
                            >
                                <Sparkles className="w-5 h-5" />
                            </button>
                            <button
                                onClick={() => setIsAddingProduct(true)}
                                className="p-2 bg-brand-primary hover:bg-brand-primary/80 rounded-lg transition-colors shadow-lg shadow-brand-primary/20"
                            >
                                <Plus className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Search Bar */}
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <CreditCard className="h-4 w-4 text-slate-500" />
                        </div>
                        <input
                            type="text"
                            placeholder="Search cards or issuers..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="block w-full pl-10 pr-3 py-2 border border-white/10 rounded-xl leading-5 bg-white/5 text-slate-300 placeholder-slate-500 focus:outline-none focus:bg-white/10 focus:ring-1 focus:ring-brand-primary sm:text-sm transition-colors"
                        />
                    </div>
                </div>

                {/* List Content */}
                <div className="space-y-4">
                    {groupedProducts.map((group) => (
                        <CollapsibleIssuer
                            key={group.issuer}
                            issuer={group.issuer}
                            count={group.products.length}
                            defaultOpen={searchTerm.length > 0} // Auto-expand when searching
                        >
                            {group.products.map((product) => (
                                <ProductRow
                                    key={product.id}
                                    product={product}
                                    onEdit={setEditingProductId}
                                />
                            ))}
                        </CollapsibleIssuer>
                    ))}

                    {groupedProducts.length === 0 && (
                        <div className="text-center py-12">
                            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-900 mb-4">
                                <CreditCard className="w-6 h-6 text-slate-600" />
                            </div>
                            <h3 className="text-slate-400 font-medium">No cards found</h3>
                            <p className="text-slate-600 text-sm mt-1">Try adjusting your search</p>
                        </div>
                    )}
                </div>

                <AddProductModal
                    isOpen={isAddingProduct}
                    onClose={() => setIsAddingProduct(false)}
                    onSuccess={fetchProducts}
                />

                <ProductDrawer
                    isOpen={!!editingProductId}
                    onClose={() => setEditingProductId(null)}
                    cardId={editingProductId}
                    onSuccess={fetchProducts}
                    onDelete={deleteProduct}
                    onAIImport={startAIImport}
                />

                <AIImportModal
                    isOpen={isAIImportOpen}
                    onClose={() => setIsAIImportOpen(false)}
                    onImport={startAIImport}
                />
            </div>
            <NavDock activeTab="admin" isAdmin={true} />
        </div>
    );
}

