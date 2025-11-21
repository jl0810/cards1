"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Trash2, Save, Loader2, CheckCircle, AlertTriangle, FileJson, CreditCard, List, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Benefit {
    id?: string;
    benefitName: string;
    type: 'STATEMENT_CREDIT' | 'EXTERNAL_CREDIT' | 'INSURANCE' | 'PERK';
    description?: string;
    timing: string;
    maxAmount: number | null;
    keywords: string[];
    isApproved?: boolean;
}

interface CardProduct {
    id: string;
    issuer: string;
    productName: string;
    cardType: string;
    annualFee: number;
    signupBonus: string;
    imageUrl: string;
    active: boolean;
    benefits: Benefit[];
}

interface ProductDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    cardId: string | null;
    onSuccess: () => void;
    onDelete?: (id: string) => void;
    onAIImport?: (issuer: string) => void;
}

type Tab = 'details' | 'benefits' | 'raw';

export function ProductDrawer({ isOpen, onClose, cardId, onSuccess, onDelete, onAIImport }: ProductDrawerProps) {
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [card, setCard] = useState<CardProduct | null>(null);
    const [activeTab, setActiveTab] = useState<Tab>('details');

    useEffect(() => {
        if (isOpen && cardId) {
            fetchCardDetails();
        } else {
            setCard(null);
            setActiveTab('details');
        }
    }, [isOpen, cardId]);

    const fetchCardDetails = async () => {
        if (!cardId) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/card-catalog/${cardId}`);
            if (!res.ok) throw new Error('Failed to fetch card');
            const data = await res.json();
            setCard(data);
        } catch (error) {
            console.error(error);
            toast.error('Could not load card details');
            onClose();
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!card) return;
        setSaving(true);
        try {
            const res = await fetch(`/api/admin/card-catalog/${card.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(card)
            });

            if (!res.ok) throw new Error('Failed to update card');

            toast.success('Card updated successfully');
            onSuccess();
            onClose();
        } catch (error) {
            console.error(error);
            toast.error('Failed to save changes');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = () => {
        if (!card || !onDelete) return;
        if (confirm('Are you sure you want to delete this product?')) {
            onDelete(card.id);
            onClose();
        }
    };

    const handleAIImport = () => {
        if (!card || !onAIImport) return;
        if (confirm(`Refresh data for ${card.issuer} using AI? This will update all cards for this issuer.`)) {
            onAIImport(card.issuer);
            onClose();
        }
    };

    const updateBenefit = (index: number, field: keyof Benefit, value: any) => {
        if (!card) return;
        const newBenefits = [...card.benefits];
        newBenefits[index] = { ...newBenefits[index], [field]: value };
        setCard({ ...card, benefits: newBenefits });
    };

    const removeBenefit = (index: number) => {
        if (!card) return;
        const newBenefits = card.benefits.filter((_, i) => i !== index);
        setCard({ ...card, benefits: newBenefits });
    };

    const addBenefit = () => {
        if (!card) return;
        const newBenefit: Benefit = {
            benefitName: 'New Benefit',
            type: 'STATEMENT_CREDIT',
            description: '',
            timing: 'Annually',
            maxAmount: 0,
            keywords: []
        };
        setCard({ ...card, benefits: [...card.benefits, newBenefit] });
        setActiveTab('benefits'); // Switch to benefits tab
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

                    {/* Drawer */}
                    <motion.div
                        initial={{ x: "100%" }}
                        animate={{ x: 0 }}
                        exit={{ x: "100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        className="fixed inset-y-0 right-0 z-50 w-full max-w-2xl bg-slate-950 border-l border-white/10 shadow-2xl flex flex-col"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-white/10 bg-slate-900/50">
                            <div>
                                <h2 className="text-xl font-bold text-white">
                                    {loading ? 'Loading...' : card?.productName}
                                </h2>
                                <p className="text-sm text-slate-400">{card?.issuer}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                {onAIImport && (
                                    <button
                                        onClick={handleAIImport}
                                        className="p-2 hover:bg-purple-500/10 rounded-lg text-slate-400 hover:text-purple-400 transition-colors"
                                        title="Refresh with AI"
                                    >
                                        <Sparkles className="w-5 h-5" />
                                    </button>
                                )}
                                {onDelete && (
                                    <button
                                        onClick={handleDelete}
                                        className="p-2 hover:bg-red-500/10 rounded-lg text-slate-400 hover:text-red-400 transition-colors mr-2"
                                        title="Delete Product"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                )}
                                <button
                                    onClick={handleSave}
                                    disabled={saving || loading}
                                    className="px-4 py-2 bg-brand-primary hover:bg-brand-primary/80 text-white rounded-lg font-bold text-sm transition-colors flex items-center gap-2 disabled:opacity-50"
                                >
                                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    Save
                                </button>
                                <button
                                    onClick={onClose}
                                    className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Tabs */}
                        <div className="flex border-b border-white/10 px-6">
                            <button
                                onClick={() => setActiveTab('details')}
                                className={cn(
                                    "px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2",
                                    activeTab === 'details'
                                        ? "border-brand-primary text-white"
                                        : "border-transparent text-slate-400 hover:text-white"
                                )}
                            >
                                <CreditCard className="w-4 h-4" />
                                Details
                            </button>
                            <button
                                onClick={() => setActiveTab('benefits')}
                                className={cn(
                                    "px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2",
                                    activeTab === 'benefits'
                                        ? "border-brand-primary text-white"
                                        : "border-transparent text-slate-400 hover:text-white"
                                )}
                            >
                                <List className="w-4 h-4" />
                                Benefits
                                {card && card.benefits.some(b => b.isApproved === false) && (
                                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                                )}
                            </button>
                            <button
                                onClick={() => setActiveTab('raw')}
                                className={cn(
                                    "px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2",
                                    activeTab === 'raw'
                                        ? "border-brand-primary text-white"
                                        : "border-transparent text-slate-400 hover:text-white"
                                )}
                            >
                                <FileJson className="w-4 h-4" />
                                JSON
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-6">
                            {loading || !card ? (
                                <div className="flex justify-center py-12">
                                    <Loader2 className="w-8 h-8 animate-spin text-brand-primary" />
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {/* DETAILS TAB */}
                                    {activeTab === 'details' && (
                                        <div className="grid grid-cols-1 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Product Name</label>
                                                <input
                                                    value={card.productName}
                                                    onChange={(e) => setCard({ ...card, productName: e.target.value })}
                                                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-brand-primary transition-colors"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Issuer</label>
                                                <input
                                                    value={card.issuer}
                                                    onChange={(e) => setCard({ ...card, issuer: e.target.value })}
                                                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-brand-primary transition-colors"
                                                />
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Annual Fee ($)</label>
                                                    <input
                                                        type="number"
                                                        value={card.annualFee || 0}
                                                        onChange={(e) => setCard({ ...card, annualFee: parseFloat(e.target.value) })}
                                                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-brand-primary transition-colors"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Card Type</label>
                                                    <select
                                                        value={card.cardType || 'Points'}
                                                        onChange={(e) => setCard({ ...card, cardType: e.target.value })}
                                                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-brand-primary transition-colors appearance-none"
                                                    >
                                                        <option value="Points" className="bg-slate-900">Points</option>
                                                        <option value="Co-brand" className="bg-slate-900">Co-brand</option>
                                                        <option value="Cashback" className="bg-slate-900">Cashback</option>
                                                    </select>
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Signup Bonus</label>
                                                <textarea
                                                    value={card.signupBonus || ''}
                                                    onChange={(e) => setCard({ ...card, signupBonus: e.target.value })}
                                                    rows={3}
                                                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-brand-primary transition-colors resize-none"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Image URL</label>
                                                <input
                                                    value={card.imageUrl || ''}
                                                    onChange={(e) => setCard({ ...card, imageUrl: e.target.value })}
                                                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-brand-primary transition-colors"
                                                />
                                                {card.imageUrl && (
                                                    <div className="mt-2 rounded-lg overflow-hidden border border-white/10 w-full h-40 bg-black/20 flex items-center justify-center">
                                                        <img src={card.imageUrl} alt="Preview" className="h-full object-contain" />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* BENEFITS TAB */}
                                    {activeTab === 'benefits' && (
                                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                            <div className="flex items-center justify-between">
                                                <h3 className="text-lg font-bold text-white">Benefits ({card.benefits.length})</h3>
                                                <button
                                                    onClick={addBenefit}
                                                    className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-bold text-white transition-colors flex items-center gap-2"
                                                >
                                                    <Plus className="w-4 h-4" /> Add New
                                                </button>
                                            </div>

                                            <div className="space-y-4">
                                                {card.benefits.map((benefit, idx) => (
                                                    <div
                                                        key={idx}
                                                        className={cn(
                                                            "p-4 rounded-xl border transition-all",
                                                            benefit.isApproved === false
                                                                ? "bg-amber-500/10 border-amber-500/30"
                                                                : "bg-white/5 border-white/10 hover:border-white/20"
                                                        )}
                                                    >
                                                        {benefit.isApproved === false && (
                                                            <div className="flex items-center justify-between mb-3 pb-3 border-b border-amber-500/20">
                                                                <div className="flex items-center gap-2 text-amber-500">
                                                                    <AlertTriangle className="w-4 h-4" />
                                                                    <span className="text-xs font-bold uppercase tracking-wider">Draft Benefit</span>
                                                                </div>
                                                                <button
                                                                    onClick={() => updateBenefit(idx, 'isApproved', true)}
                                                                    className="text-xs font-bold text-green-400 hover:text-green-300 flex items-center gap-1 bg-green-500/10 px-2 py-1 rounded-md border border-green-500/20"
                                                                >
                                                                    <CheckCircle className="w-3 h-3" />
                                                                    Approve
                                                                </button>
                                                            </div>
                                                        )}

                                                        <div className="grid grid-cols-1 gap-4">
                                                            <div className="grid grid-cols-[1fr,auto] gap-4">
                                                                <input
                                                                    value={benefit.benefitName}
                                                                    onChange={(e) => updateBenefit(idx, 'benefitName', e.target.value)}
                                                                    className="bg-transparent text-lg font-bold text-white placeholder:text-slate-600 focus:outline-none border-b border-transparent focus:border-brand-primary px-0 py-1"
                                                                    placeholder="Benefit Name"
                                                                />
                                                                <button
                                                                    onClick={() => removeBenefit(idx)}
                                                                    className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
                                                            </div>

                                                            <div className="grid grid-cols-2 gap-4">
                                                                <div>
                                                                    <label className="text-[10px] font-bold text-slate-500 uppercase">Type</label>
                                                                    <select
                                                                        value={benefit.type}
                                                                        onChange={(e) => updateBenefit(idx, 'type', e.target.value)}
                                                                        className="w-full mt-1 bg-black/20 border border-white/10 rounded-lg px-2 py-1.5 text-sm text-slate-300 focus:outline-none focus:border-brand-primary"
                                                                    >
                                                                        <option value="STATEMENT_CREDIT" className="bg-slate-900">Statement Credit</option>
                                                                        <option value="EXTERNAL_CREDIT" className="bg-slate-900">External Credit</option>
                                                                        <option value="INSURANCE" className="bg-slate-900">Insurance</option>
                                                                        <option value="PERK" className="bg-slate-900">Perk</option>
                                                                    </select>
                                                                </div>
                                                                <div>
                                                                    <label className="text-[10px] font-bold text-slate-500 uppercase">Value ($)</label>
                                                                    <input
                                                                        type="number"
                                                                        value={benefit.maxAmount || ''}
                                                                        onChange={(e) => updateBenefit(idx, 'maxAmount', parseFloat(e.target.value))}
                                                                        className="w-full mt-1 bg-black/20 border border-white/10 rounded-lg px-2 py-1.5 text-sm text-slate-300 focus:outline-none focus:border-brand-primary"
                                                                        placeholder="0.00"
                                                                    />
                                                                </div>
                                                            </div>

                                                            <div>
                                                                <label className="text-[10px] font-bold text-slate-500 uppercase">Description</label>
                                                                <textarea
                                                                    value={benefit.description || ''}
                                                                    onChange={(e) => updateBenefit(idx, 'description', e.target.value)}
                                                                    rows={2}
                                                                    className="w-full mt-1 bg-black/20 border border-white/10 rounded-lg px-2 py-1.5 text-sm text-slate-300 focus:outline-none focus:border-brand-primary resize-none"
                                                                    placeholder="Description of the benefit..."
                                                                />
                                                            </div>

                                                            <div className="grid grid-cols-2 gap-4">
                                                                <div>
                                                                    <label className="text-[10px] font-bold text-slate-500 uppercase">Timing</label>
                                                                    <select
                                                                        value={benefit.timing}
                                                                        onChange={(e) => updateBenefit(idx, 'timing', e.target.value)}
                                                                        className="w-full mt-1 bg-black/20 border border-white/10 rounded-lg px-2 py-1.5 text-sm text-slate-300 focus:outline-none focus:border-brand-primary"
                                                                    >
                                                                        <option value="Monthly" className="bg-slate-900">Monthly</option>
                                                                        <option value="Annually" className="bg-slate-900">Annually</option>
                                                                        <option value="SemiAnnually" className="bg-slate-900">Semi-Annually</option>
                                                                        <option value="Quarterly" className="bg-slate-900">Quarterly</option>
                                                                        <option value="OneTime" className="bg-slate-900">One Time</option>
                                                                    </select>
                                                                </div>
                                                                <div>
                                                                    <label className="text-[10px] font-bold text-slate-500 uppercase">Keywords</label>
                                                                    <input
                                                                        value={benefit.keywords.join(', ')}
                                                                        onChange={(e) => updateBenefit(idx, 'keywords', e.target.value.split(',').map(s => s.trim()))}
                                                                        className="w-full mt-1 bg-black/20 border border-white/10 rounded-lg px-2 py-1.5 text-sm text-slate-300 focus:outline-none focus:border-brand-primary"
                                                                        placeholder="uber, eats"
                                                                    />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* RAW TAB */}
                                    {activeTab === 'raw' && (
                                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                            <pre className="bg-black/50 p-4 rounded-xl overflow-x-auto text-xs text-green-400 font-mono border border-white/10">
                                                {JSON.stringify(card, null, 2)}
                                            </pre>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
