'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Building2, CreditCard, Plus, Trash2, RefreshCw, Users } from 'lucide-react';
import PlaidLink from '@/components/plaid-link';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useBankLogo } from '@/hooks/use-bank-logo';
import { FamilyMemberSelector } from './family-member-selector';

// ... (BankLogo component remains the same)
function BankLogo({ name }: { name: string | null }) {
    const [theme, setTheme] = useState<'light' | 'dark'>('dark');
    const logoUrl = useBankLogo(name, {
        size: 128,
        format: 'webp',
        theme: theme,
    });
    const [error, setError] = useState(false);
    const [isVisible, setIsVisible] = useState(false);

    // Detect theme from system/user preference
    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        setTheme(mediaQuery.matches ? 'dark' : 'light');

        const handler = (e: MediaQueryListEvent) => {
            setTheme(e.matches ? 'dark' : 'light');
        };

        mediaQuery.addEventListener('change', handler);
        return () => mediaQuery.removeEventListener('change', handler);
    }, []);

    // Get initials from bank name
    const getInitials = (bankName: string | null) => {
        if (!bankName) return 'B';
        const words = bankName.split(' ').filter(w => w.length > 0);
        if (words.length === 1) return words[0].substring(0, 2).toUpperCase();
        return words.slice(0, 2).map(w => w[0]).join('').toUpperCase();
    };

    // Get a color based on bank name (consistent hash)
    const getColor = (bankName: string | null) => {
        if (!bankName) return 'bg-blue-600';
        const colors = [
            'bg-blue-600', 'bg-purple-600', 'bg-pink-600',
            'bg-red-600', 'bg-orange-600', 'bg-yellow-600',
            'bg-green-600', 'bg-teal-600', 'bg-cyan-600'
        ];
        const hash = bankName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        return colors[hash % colors.length];
    };

    if (!logoUrl || error) {
        return (
            <div className={`w-10 h-10 rounded-lg ${getColor(name)} flex items-center justify-center`}>
                <span className="text-white text-xs font-bold">{getInitials(name)}</span>
            </div>
        );
    }

    return (
        <div className="w-10 h-10 rounded-lg bg-white p-1 flex items-center justify-center overflow-hidden">
            <img
                src={logoUrl}
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
    familyMemberId: string; // Added familyMemberId
}

interface FamilyMember {
    id: string;
    name: string;
    avatar?: string | null;
    isPrimary: boolean;
}

export function BankAccountsView() {
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

    const syncTransactions = async (itemId: string) => {
        toast.promise(
            fetch('/api/plaid/sync-transactions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ itemId, cursor: null }),
            }),
            {
                loading: 'Syncing transactions...',
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
                            onClick={() => {
                                toast.info("Syncing for first item");
                                syncTransactions(items[0].itemId);
                            }}
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
                    {items.map((item) => (
                        <motion.div
                            key={item.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden"
                        >
                            <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/5">
                                <div className="flex items-center gap-3">
                                    <BankLogo name={item.institutionName} />
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
