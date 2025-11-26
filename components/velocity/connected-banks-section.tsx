"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Building2, RefreshCw, Unplug, UserCheck, AlertCircle, CheckCircle, Clock, ChevronDown, ChevronUp, Link as LinkIcon } from "lucide-react";
import { toast } from "sonner";
import { useBankBrand } from "@/hooks/use-bank-brand";
import { FamilyMemberDropdown } from "./family-member-dropdown";
import { LinkedCardDisplay } from "./linked-card-display";
import { CardProductMatcher } from "./card-product-matcher";



interface PlaidItem {
    id: string;
    itemId: string;
    institutionId: string | null;
    institutionName: string | null;
    status: string;
    lastSyncedAt: string | null;
    bankId?: string | null;
    familyMember: {
        id: string;
        name: string;
    };
    accounts: Array<{
        id: string;
        name: string;
        mask: string | null;
        currentBalance: number | null;
        extended?: {
            id: string;
            cardProductId: string | null;
            cardProduct?: {
                id: string;
                issuer: string;
                productName: string;
                cardType: string | null;
                annualFee: number | null;
                signupBonus: string | null;
                imageUrl: string | null;
                benefits: Array<{
                    id: string;
                    benefitName: string;
                    timing: string;
                    maxAmount: number | null;
                    keywords: string[];
                }>;
            } | null;
        } | null;
    }>;
}


function BankConnectionCard({ item, familyMembers, onReassign, onRefresh, onDisconnect, onAccountLinked }: {
    item: PlaidItem;
    familyMembers: any[];
    onReassign: (itemId: string, memberId: string) => void;
    onRefresh: (itemId: string) => void;
    onDisconnect: (itemId: string) => void;
    onAccountLinked: () => void;
}) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isReassigning, setIsReassigning] = useState(false);
    const [linkingAccountId, setLinkingAccountId] = useState<string | null>(null);
    const { brand } = useBankBrand(item.bankId || null);

    const statusConfig = {
        active: { color: 'text-emerald-400', bg: 'bg-emerald-500/10', icon: CheckCircle, label: 'Active' },
        disconnected: { color: 'text-slate-400', bg: 'bg-slate-500/10', icon: Unplug, label: 'Disconnected' },
        error: { color: 'text-red-400', bg: 'bg-red-500/10', icon: AlertCircle, label: 'Error' },
        needs_reauth: { color: 'text-amber-400', bg: 'bg-amber-500/10', icon: AlertCircle, label: 'Needs Re-auth' },
    };

    const status = statusConfig[item.status as keyof typeof statusConfig] || statusConfig.active;
    const StatusIcon = status.icon;

    const formatDate = (date: string | null) => {
        if (!date) return 'Never';
        return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="glass-card rounded-2xl overflow-hidden group"
        >
            {/* Header */}
            <div className="p-4">
                <div className="flex items-start gap-4">
                    {/* Bank Logo */}
                    <div className="relative">
                        <div className="w-14 h-14 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden">
                            {brand?.logoUrl ? (
                                <img src={brand.logoUrl} alt={item.institutionName || ''} className="w-10 h-10 object-contain" />
                            ) : (
                                <div
                                    className="w-full h-full flex items-center justify-center"
                                    style={{ backgroundColor: brand?.brandColor || undefined }}
                                >
                                    <Building2 className="w-6 h-6 text-slate-400" />
                                </div>
                            )}
                        </div>
                        {/* Status Badge */}
                        <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full ${status.bg} border-2 border-dark-900 flex items-center justify-center`}>
                            <StatusIcon className={`w-3 h-3 ${status.color}`} />
                        </div>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                        <h3 className="text-base font-bold text-white mb-1 truncate">{item.institutionName || 'Unknown Bank'}</h3>
                        <div className="flex items-center gap-2 text-xs text-slate-400 mb-2">
                            <UserCheck className="w-3 h-3" />
                            <span>{item.familyMember.name}</span>
                            <span className="text-slate-600">•</span>
                            <span>{item.accounts.length} account{item.accounts.length !== 1 ? 's' : ''}</span>
                        </div>
                        <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold ${status.bg} ${status.color}`}>
                            <StatusIcon className="w-3 h-3" />
                            {status.label}
                        </div>
                    </div>

                    {/* Expand Button */}
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="p-2 hover:bg-white/5 rounded-lg transition-colors"
                    >
                        {isExpanded ? (
                            <ChevronUp className="w-5 h-5 text-slate-400" />
                        ) : (
                            <ChevronDown className="w-5 h-5 text-slate-400" />
                        )}
                    </button>
                </div>
            </div>

            {/* Expanded Content */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        <div className="px-4 pb-4 space-y-4 border-t border-white/5">
                            {/* Accounts List */}
                            <div className="pt-4">
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Linked Accounts</p>
                                <div className="space-y-3">
                                    {item.accounts.map((account) => (
                                        <div key={account.id} className="space-y-2">
                                            {/* Account Header */}
                                            <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                                                <div>
                                                    <p className="text-sm font-bold text-white">{account.name}</p>
                                                    <p className="text-xs text-slate-400">••••{account.mask || '****'}</p>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    {account.currentBalance !== null && (
                                                        <p className="text-sm font-mono font-bold text-white">
                                                            ${account.currentBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                                        </p>
                                                    )}
                                                    <button
                                                        onClick={() => setLinkingAccountId(account.id)}
                                                        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold rounded-lg transition-all bg-gradient-to-r from-purple-600/20 to-pink-600/20 hover:from-purple-600/30 hover:to-pink-600/30 text-purple-300 border border-purple-500/30"
                                                    >
                                                        <LinkIcon className="w-3 h-3" />
                                                        {account.extended?.cardProduct ? 'Change' : 'Link Card'}
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Premium Card Display when linked */}
                                            {account.extended?.cardProduct && (
                                                <LinkedCardDisplay product={account.extended.cardProduct} />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Last Synced */}
                            <div className="flex items-center gap-2 text-xs text-slate-400">
                                <Clock className="w-3 h-3" />
                                <span>Last synced: {formatDate(item.lastSyncedAt)}</span>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2">
                                {/* Reassign */}
                                {isReassigning ? (
                                    <FamilyMemberDropdown
                                        members={familyMembers}
                                        selectedId={item.familyMember.id}
                                        onSelect={(memberId) => {
                                            onReassign(item.id, memberId);
                                        }}
                                        onClose={() => setIsReassigning(false)}
                                    />
                                ) : (
                                    <button
                                        onClick={() => setIsReassigning(true)}
                                        className="flex-1 px-3 py-2 text-xs font-bold bg-white/5 hover:bg-white/10 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                                    >
                                        <UserCheck className="w-4 h-4" />
                                        Reassign
                                    </button>
                                )}

                                {/* Check Connection Status */}
                                <button
                                    onClick={() => onRefresh(item.id)}
                                    className="px-3 py-2 text-xs font-bold bg-white/5 hover:bg-white/10 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                                >
                                    <RefreshCw className="w-4 h-4" />
                                    Check Status
                                </button>

                                {/* Disconnect */}
                                {item.status !== 'disconnected' && (
                                    <button
                                        onClick={() => onDisconnect(item.id)}
                                        className="px-3 py-2 text-xs font-bold bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors flex items-center justify-center gap-2"
                                    >
                                        <Unplug className="w-4 h-4" />
                                        Disconnect
                                    </button>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Card Product Matcher Modal */}
            {linkingAccountId && (() => {
                const account = item.accounts.find(a => a.id === linkingAccountId);
                if (!account) return null;

                return (
                    <CardProductMatcher
                        isOpen={!!linkingAccountId}
                        onClose={() => setLinkingAccountId(null)}
                        accountId={account.id}
                        accountName={account.name}
                        institutionName={item.institutionName}
                        currentProductId={account.extended?.cardProductId}
                        onSuccess={() => {
                            setLinkingAccountId(null);
                            onAccountLinked();
                        }}
                    />
                );
            })()}
        </motion.div>
    );
}

export function ConnectedBanksSection({ familyMembers }: { familyMembers: any[] }) {
    const [items, setItems] = useState<PlaidItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [showDisconnected, setShowDisconnected] = useState(false);

    const fetchItems = async () => {
        try {
            const res = await fetch('/api/plaid/items');
            if (res.ok) {
                const data = await res.json();
                setItems(data);
            }
        } catch (error) {
            console.error('Error fetching items:', error);
            toast.error('Failed to load connected banks');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchItems();
    }, []);

    const handleReassign = async (itemId: string, memberId: string) => {
        try {
            const res = await fetch(`/api/plaid/items/${itemId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ familyMemberId: memberId })
            });

            if (res.ok) {
                await fetchItems();
                const member = familyMembers.find(m => m.id === memberId);
                toast.success(`Reassigned to ${member?.name}`);
            } else {
                toast.error('Failed to reassign');
            }
        } catch (error) {
            toast.error('Failed to reassign');
        }
    };

    const handleRefresh = async (itemId: string) => {
        toast.promise(
            fetch(`/api/plaid/items/${itemId}/status`).then(res => res.json()),
            {
                loading: 'Checking status...',
                success: 'Status updated',
                error: 'Failed to refresh status'
            }
        );
        await fetchItems();
    };

    const handleDisconnect = async (itemId: string) => {
        const item = items.find(i => i.id === itemId);
        if (!item) return;

        toast.custom((t) => (
            <div className="bg-dark-800 border border-white/10 rounded-xl p-4 shadow-2xl backdrop-blur-xl">
                <div className="flex items-start gap-3">
                    <div className="flex-1">
                        <p className="text-sm font-bold text-white mb-1">Disconnect {item.institutionName}?</p>
                        <p className="text-xs text-slate-400">This will stop syncing but preserve your data.</p>
                    </div>
                </div>
                <div className="flex gap-2 mt-3">
                    <button
                        onClick={async () => {
                            toast.dismiss(t);
                            try {
                                const res = await fetch(`/api/plaid/items/${itemId}/disconnect`, { method: 'POST' });
                                if (res.ok) {
                                    await fetchItems();
                                    toast.success(`${item.institutionName} disconnected`);
                                } else {
                                    toast.error('Failed to disconnect');
                                }
                            } catch (error) {
                                toast.error('Failed to disconnect');
                            }
                        }}
                        className="flex-1 px-3 py-1.5 text-xs font-bold bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                    >
                        Disconnect
                    </button>
                    <button
                        onClick={() => toast.dismiss(t)}
                        className="flex-1 px-3 py-1.5 text-xs font-bold bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        ), { duration: Infinity });
    };

    const filteredItems = showDisconnected ? items : items.filter(i => i.status !== 'disconnected');

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-2 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-sm font-bold text-white">Connected Banks</h3>
                    <p className="text-xs text-slate-400 mt-1">{filteredItems.length} active connection{filteredItems.length !== 1 ? 's' : ''}</p>
                </div>
                <button
                    onClick={() => setShowDisconnected(!showDisconnected)}
                    className="text-xs font-bold text-slate-400 hover:text-white transition-colors"
                >
                    {showDisconnected ? 'Hide' : 'Show'} Disconnected
                </button>
            </div>

            {/* Items List */}
            <div className="space-y-3">
                <AnimatePresence>
                    {filteredItems.map((item) => (
                        <BankConnectionCard
                            key={item.id}
                            item={item}
                            familyMembers={familyMembers}
                            onReassign={handleReassign}
                            onRefresh={handleRefresh}
                            onDisconnect={handleDisconnect}
                            onAccountLinked={fetchItems}
                        />
                    ))}
                </AnimatePresence>

                {filteredItems.length === 0 && (
                    <div className="text-center py-12">
                        <Building2 className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                        <p className="text-sm text-slate-400">No connected banks</p>
                    </div>
                )}
            </div>
        </div>
    );
}
