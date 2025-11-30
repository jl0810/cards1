import { useState, useEffect, useCallback } from 'react';
import type { Account, PlaidItem, PlaidAccount } from '@/types/dashboard';
import { calculatePaymentCycleStatus } from '@/lib/payment-cycle';

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
                item.accounts.map((acc: PlaidAccount) => {
                    // Calculate Payment Cycle Status
                    const paymentCycleData = {
                        lastStatementBalance: acc.lastStatementBalance || 0,
                        lastStatementIssueDate: acc.lastStatementIssueDate ? new Date(acc.lastStatementIssueDate) : null,
                        currentBalance: acc.currentBalance || 0,
                        paymentMarkedPaidDate: acc.extended?.paymentMarkedPaidDate ? new Date(acc.extended.paymentMarkedPaidDate) : null,
                        lastPaymentAmount: acc.lastPaymentAmount || null,
                        lastPaymentDate: acc.lastPaymentDate ? new Date(acc.lastPaymentDate) : null,
                    };

                    if (acc.name.includes('Aviator') || acc.name.includes('Hawaiian')) {
                        console.log(`[PaymentCycle Debug] ${acc.name}:`, paymentCycleData);
                    }

                    const paymentCycleStatus = calculatePaymentCycleStatus(paymentCycleData);

                    return {
                        id: acc.id,
                        userId: 'current-user', // Placeholder as we don't have multi-user auth context in frontend yet
                        bank: item.institutionName || 'Unknown Bank',
                        name: acc.extended?.nickname || acc.officialName || acc.name,
                        balance: acc.currentBalance || 0,
                        paymentCycleStatus, // Expose the calculated status
                        due: acc.nextPaymentDueDate
                            ? (() => {
                                const dueDate = new Date(acc.nextPaymentDueDate);
                                const today = new Date();
                                // Reset time to start of day for both dates for proper comparison
                                dueDate.setHours(0, 0, 0, 0);
                                today.setHours(0, 0, 0, 0);
                                const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                                if (diffDays < 0) return 'Overdue';
                                if (diffDays === 0) return 'Today';
                                if (diffDays === 1) return 'Tomorrow';
                                if (diffDays <= 7) return `${diffDays} days`;
                                return formatDate(acc.nextPaymentDueDate);
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
                    };
                })
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
