"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { toast } from "sonner";

interface ProductFormData {
    issuer: string;
    productName: string;
    cardType: string;
    annualFee: string;
    signupBonus: string;
    imageUrl: string;
}

interface AddProductModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function AddProductModal({ isOpen, onClose, onSuccess }: AddProductModalProps) {
    const [formData, setFormData] = useState<ProductFormData>({
        issuer: '',
        productName: '',
        cardType: 'Points',
        annualFee: '',
        signupBonus: '',
        imageUrl: ''
    });
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        try {
            const res = await fetch('/api/admin/card-catalog', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    annualFee: formData.annualFee ? parseFloat(formData.annualFee) : null
                })
            });

            if (res.ok) {
                toast.success('Card product created');
                onSuccess();
                onClose();
                setFormData({
                    issuer: '',
                    productName: '',
                    cardType: 'Points',
                    annualFee: '',
                    signupBonus: '',
                    imageUrl: ''
                });
            } else {
                const data = await res.json();
                toast.error(data.error || 'Failed to create product');
            }
        } catch (error) {
            toast.error('Error creating product');
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
                            className="bg-dark-800 rounded-2xl border border-white/10 shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto"
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between p-6 border-b border-white/5">
                                <h2 className="text-xl font-bold text-white">Add Card Product</h2>
                                <button
                                    onClick={onClose}
                                    className="p-2 hover:bg-white/5 rounded-lg transition-colors"
                                >
                                    <X className="w-5 h-5 text-slate-400" />
                                </button>
                            </div>

                            {/* Form */}
                            <form onSubmit={handleSubmit} className="p-6 space-y-4">
                                {/* Issuer */}
                                <div>
                                    <label className="block text-sm font-bold text-slate-300 mb-2">
                                        Issuer <span className="text-red-400">*</span>
                                    </label>
                                    <select
                                        required
                                        value={formData.issuer}
                                        onChange={(e) => setFormData({ ...formData, issuer: e.target.value })}
                                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-brand-primary"
                                    >
                                        <option value="">Select issuer</option>
                                        <option value="American Express">American Express</option>
                                        <option value="Chase">Chase</option>
                                        <option value="Citi">Citi</option>
                                        <option value="Capital One">Capital One</option>
                                        <option value="Barclays">Barclays</option>
                                        <option value="Wells Fargo">Wells Fargo</option>
                                        <option value="Bank of America">Bank of America</option>
                                        <option value="U.S. Bank">U.S. Bank</option>
                                    </select>
                                </div>

                                {/* Product Name */}
                                <div>
                                    <label className="block text-sm font-bold text-slate-300 mb-2">
                                        Product Name <span className="text-red-400">*</span>
                                    </label>
                                    <input
                                        required
                                        type="text"
                                        placeholder="e.g., Sapphire Reserve"
                                        value={formData.productName}
                                        onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
                                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-brand-primary"
                                    />
                                </div>

                                {/* Card Type */}
                                <div>
                                    <label className="block text-sm font-bold text-slate-300 mb-2">
                                        Card Type
                                    </label>
                                    <select
                                        value={formData.cardType}
                                        onChange={(e) => setFormData({ ...formData, cardType: e.target.value })}
                                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-brand-primary"
                                    >
                                        <option value="Points">Points</option>
                                        <option value="Co-brand">Co-brand</option>
                                        <option value="Cashback">Cashback</option>
                                    </select>
                                </div>

                                {/* Annual Fee */}
                                <div>
                                    <label className="block text-sm font-bold text-slate-300 mb-2">
                                        Annual Fee ($)
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        placeholder="e.g., 550"
                                        value={formData.annualFee}
                                        onChange={(e) => setFormData({ ...formData, annualFee: e.target.value })}
                                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-brand-primary"
                                    />
                                </div>

                                {/* Signup Bonus */}
                                <div>
                                    <label className="block text-sm font-bold text-slate-300 mb-2">
                                        Signup Bonus
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g., 75,000 points after $4,000 spend"
                                        value={formData.signupBonus}
                                        onChange={(e) => setFormData({ ...formData, signupBonus: e.target.value })}
                                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-brand-primary"
                                    />
                                </div>

                                {/* Image URL */}
                                <div>
                                    <label className="block text-sm font-bold text-slate-300 mb-2">
                                        Image URL
                                    </label>
                                    <input
                                        type="url"
                                        placeholder="https://example.com/card.png"
                                        value={formData.imageUrl}
                                        onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-brand-primary"
                                    />
                                </div>

                                {/* Actions */}
                                <div className="flex gap-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        className="flex-1 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg font-bold text-white transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={saving}
                                        className="flex-1 px-4 py-2 bg-brand-primary hover:bg-brand-primary/80 rounded-lg font-bold text-white transition-colors disabled:opacity-50"
                                    >
                                        {saving ? 'Creating...' : 'Create Product'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    );
}
