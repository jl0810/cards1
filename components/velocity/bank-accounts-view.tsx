'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Building2, CreditCard, Plus, Trash2, RefreshCw, Users } from 'lucide-react';
import PlaidLink from '@/components/plaid-link';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useBankBrand } from '@/hooks/use-bank-brand';
import { FamilyMemberSelector } from './family-member-selector';

// ... (BankLogo component remains the same)
function BankLogo({ name, bankId }: { name: string | null, bankId?: string | null }) {
    const { brand, loading } = useBankBrand(bankId || null);
    const [error, setError] = useState(false);

    // Get initials from bank name
    const getInitials = (bankName: string | null) => {
        if (!bankName) return 'B';
        const words = bankName.split(' ').filter(w => w.length > 0);
        if (words.length === 1) return words[0].substring(0, 2).toUpperCase();
        return words.slice(0, 2).map(w => w[0]).join('').toUpperCase();
    };

    // Get a color based on bank name (consistent hash)
    const getColor = (bankName: string | null) => {
        if (!bankName) return 'bg-brand-primary';
        // Use brand-aligned colors
        const colors = [
            'bg-blue-600', 'bg-indigo-600', 'bg-violet-600',
            'bg-purple-600', 'bg-fuchsia-600', 'bg-pink-600',
            'bg-rose-600', 'bg-orange-600', 'bg-amber-600',
            'bg-emerald-600', 'bg-teal-600', 'bg-cyan-600',
            'bg-sky-600'
        ];
        const hash = bankName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        return colors[hash % colors.length];
    };

    if (loading || !brand?.logoUrl || error) {
        return (
            <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center relative`}
                style={{ backgroundColor: brand?.brandColor || undefined }}
            >
                {!brand?.brandColor && <div className={`absolute inset-0 rounded-lg ${getColor(name)} opacity-100`} />}
                <span className="text-white text-xs font-bold relative z-10">{getInitials(name)}</span>
            </div>
        );
    }

    return (
        <div className="w-10 h-10 rounded-lg bg-white p-1 flex items-center justify-center overflow-hidden">
            <img
                src={brand.logoUrl}
                alt={name || 'Bank Logo'}
                className="w-full h-full object-contain"
                loading="lazy"
                onError={() => setError(true)}
            />
        </div>
    );
}

interface PlaidAccount {
    id: string;
    name: string;
    mask: string;
    type: string;
    subtype: string;
    currentBalance: number | null;
    isoCurrencyCode: string | null;
}

interface PlaidItem {
    id: string;
    itemId: string;
    institutionName: string | null;
    status: string;
    accounts: PlaidAccount[];
    familyMemberId: string;
    bankId?: string | null;
}

interface FamilyMember {
    id: string;
    name: string;
    avatar?: string | null;
    isPrimary: boolean;
}

export function BankAccountsView({ activeUser = 'all' }: { activeUser?: string }) {
    const [items, setItems] = useState<PlaidItem[]>([]);
    const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        try {
            const [itemsRes, familyRes] = await Promise.all([
                fetch('/api/plaid/items'),
                fetch('/api/user/family')
            ]);

            if (!itemsRes.ok) throw new Error('Failed to fetch items');
            if (!familyRes.ok) throw new Error('Failed to fetch family members');

            const itemsData = await itemsRes.json();
            const familyData = await familyRes.json();

            setItems(itemsData);
            setFamilyMembers(familyData);
        } catch (error) {
            console.error(error);
            // toast.error('Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    // Filter items by active user
    const filteredItems = activeUser === 'all'
        ? items
        : items.filter(item => item.familyMemberId === activeUser);

    const syncTransactions = async (itemId?: string) => {
        const itemsToSync = itemId ? items.filter(i => i.itemId === itemId) : items;

        if (itemsToSync.length === 0) return;

        toast.promise(
            Promise.all(itemsToSync.map(item =>
                fetch('/api/plaid/sync-transactions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ itemId: item.itemId, cursor: null }),
                })
            )),
            {
                loading: itemId ? 'Syncing transactions...' : `Syncing ${itemsToSync.length} connections...`,
                success: 'Transactions synced!',
                error: 'Failed to sync transactions',
            }
        );
    };

    const updateItemFamilyMember = async (itemId: string, familyMemberId: string) => {
        // Optimistic update
        const originalItems = [...items];
        setItems(items.map(item =>
            item.id === itemId ? { ...item, familyMemberId } : item
        ));

        try {
            const res = await fetch(`/api/plaid/items/${itemId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ familyMemberId }),
            });

            if (!res.ok) throw new Error('Failed to update assignment');

            toast.success('Assigned to family member');
        } catch (error) {
            console.error(error);
            toast.error('Failed to update assignment');
            setItems(originalItems); // Revert on error
        }
    };

    const deleteItem = async (itemId: string) => {
        if (!confirm('Are you sure you want to disconnect this bank? This will remove all associated accounts and transactions.')) return;

        // Optimistic update
        const originalItems = [...items];
        setItems(items.filter(i => i.id !== itemId));

        try {
            const res = await fetch(`/api/plaid/items/${itemId}`, {
                method: 'DELETE',
            });

            if (!res.ok) throw new Error('Failed to delete item');
            toast.success('Bank disconnected');
        } catch (error) {
            console.error(error);
            toast.error('Failed to disconnect bank');
            setItems(originalItems);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    return (
        <div className="pb-24 space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white">Bank Accounts</h2>
                <div className="flex items-center gap-2">
                    {items.length > 0 && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => syncTransactions()}
                        >
                            <RefreshCw className="w-4 h-4 mr-2" /> Sync All
                        </Button>
                    )}
                    <PlaidLink />
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-12">
                    <RefreshCw className="w-6 h-6 text-slate-500 animate-spin" />
                </div>
            ) : items.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center space-y-4 bg-white/5 rounded-2xl border border-white/10 p-8">
                    <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
                        <Building2 className="w-8 h-8 text-slate-400" />
                    </div>
                    <div>
                        <h3 className="text-lg font-medium text-white">No accounts linked</h3>
                        <p className="text-slate-400 text-sm mt-1">Connect your bank to start tracking your finances.</p>
                    </div>
                </div>
            ) : (
                <div className="grid gap-6">
                    {filteredItems.map((item) => (
                        <motion.div
                            key={item.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden"
                        >
                            <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/5">
                                <div className="flex items-center gap-4">
                                    <BankLogo name={item.institutionName} bankId={item.bankId} />
                                    <div>
                                        <h3 className="font-semibold text-white">{item.institutionName || 'Unknown Bank'}</h3>
                                        <p className="text-xs text-slate-400 capitalize">{item.status}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <FamilyMemberSelector
                                        currentMemberId={item.familyMemberId}
                                        members={familyMembers}
                                        onSelect={(memberId) => updateItemFamilyMember(item.id, memberId)}
                                    />
                                    <Button variant="ghost" size="icon" className="text-slate-400 hover:text-red-400 hover:bg-red-400/10">
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>

                            <div className="p-4 space-y-3">
                                {item.accounts.map((account) => (
                                    <div key={account.id} className="flex items-center justify-between p-3 rounded-xl bg-black/20 hover:bg-black/30 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <CreditCard className="w-5 h-5 text-slate-500" />
                                            <div>
                                                <p className="text-sm font-medium text-slate-200">{account.name}</p>
                                                <p className="text-xs text-slate-500">•••• {account.mask}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-mono text-sm text-white">
                                                {new Intl.NumberFormat('en-US', { style: 'currency', currency: account.isoCurrencyCode || 'USD' }).format(account.currentBalance || 0)}
                                            </p>
                                            <p className="text-xs text-slate-500 capitalize">{account.subtype || account.type}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    );
}
