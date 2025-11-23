import { useState, useEffect, useCallback } from 'react';
import type { Account, PlaidItem, PlaidAccount } from '@/types/dashboard';

interface UseAccountsReturn {
    accounts: Account[];
    loading: boolean;
    error: Error | null;
    offline: boolean;
    refresh: () => Promise<void>;
}

/**
 * Custom hook for managing Plaid accounts
 * Handles fetching, transformation, and error states
 */
export function useAccounts(): UseAccountsReturn {
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);
    const [offline, setOffline] = useState(false);

    const formatCurrency = (value: number | null | undefined, currency?: string | null): string => {
        if (value === null || value === undefined) return 'N/A';
        try {
            return new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: currency || 'USD'
            }).format(value);
        } catch {
            return `$${value.toLocaleString()}`;
        }
    };

    const formatPercent = (value: number | null | undefined): string => {
        if (value === null || value === undefined) return 'N/A';
        return `${value.toFixed(2)}%`;
    };

    const formatDate = (value: string | null | undefined): string => {
        if (!value) return 'N/A';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return 'N/A';
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    const fetchAccounts = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            setOffline(false);

            const res = await fetch('/api/plaid/items');
            if (!res.ok) {
                const text = await res.text();
                // If 404 (User profile not found), just return empty list
                if (res.status === 404) {
                    setAccounts([]);
                    return;
                }
                throw new Error(text || 'Failed to fetch items');
            }

            const items: PlaidItem[] = await res.json();

            // Transform Plaid items/accounts into WalletView format
            const allAccounts: Account[] = items.flatMap((item: PlaidItem) =>
                item.accounts.map((acc: PlaidAccount) => ({
                    id: acc.id,
                    userId: 'current-user', // Placeholder as we don't have multi-user auth context in frontend yet
                    bank: item.institutionName || 'Unknown Bank',
                    name: acc.extended?.nickname || acc.officialName || acc.name,
                    balance: acc.currentBalance || 0,
                    due: acc.nextPaymentDueDate
                        ? (() => {
                            const diffDays = Math.ceil((new Date(acc.nextPaymentDueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                            if (diffDays < 0) return 'Overdue';
                            if (diffDays === 0) return 'Today';
                            if (diffDays === 1) return 'Tomorrow';
                            return `${diffDays} days`;
                        })()
                        : 'N/A',
                    type: acc.subtype || acc.type,
                    color: 'from-slate-800 to-slate-900', // Default color
                    liabilities: {
                        apr: formatPercent(acc.apr),
                        aprType: acc.aprType || 'N/A',
                        aprBalanceSubjectToApr: formatCurrency(acc.aprBalanceSubjectToApr, acc.isoCurrencyCode),
                        aprInterestChargeAmount: formatCurrency(acc.aprInterestChargeAmount, acc.isoCurrencyCode),
                        limit: formatCurrency(acc.limit, acc.isoCurrencyCode),
                        min_due: formatCurrency(acc.minPaymentAmount, acc.isoCurrencyCode),
                        last_statement: formatCurrency(acc.lastStatementBalance, acc.isoCurrencyCode),
                        next_due_date: formatDate(acc.nextPaymentDueDate),
                        last_statement_date: formatDate(acc.lastStatementIssueDate),
                        last_payment_amount: formatCurrency(acc.lastPaymentAmount, acc.isoCurrencyCode),
                        last_payment_date: formatDate(acc.lastPaymentDate),
                        status: acc.isOverdue ? 'Overdue' : (acc.nextPaymentDueDate ? 'Current' : 'N/A')
                    }
                }))
            );

            setAccounts(allAccounts);
        } catch (err) {
            const error = err instanceof Error ? err : new Error('Unknown error');
            setError(error);
            console.error('Error fetching accounts:', error);

            // Check if offline
            if (!navigator.onLine) {
                setOffline(true);
            }
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAccounts();
    }, [fetchAccounts]);

    return {
        accounts,
        loading,
        error,
        offline,
        refresh: fetchAccounts,
    };
}
