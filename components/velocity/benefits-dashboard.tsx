'use client';

// Force re-compile
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, RefreshCw, ChevronRight, CreditCard, AlertCircle, CheckCircle2, Clock, Check, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { NavDock } from "@/components/layout/nav-dock";
import { AppHeader } from "@/components/layout/app-header";

interface BenefitProgress {
    id: string;
    benefitName: string;
    cardProductName: string;
    cardIssuer: string;
    type: string;
    timing: string;
    maxAmount: number;
    usedAmount: number;
    remainingAmount: number;
    percentage: number;
    transactionCount: number;
    lastUsed?: Date;
    periodEnd: Date;
    daysRemaining: number;
}

interface BenefitsDashboardProps {
    accountId?: string; // Filter by specific account
    period?: 'month' | 'quarter' | 'year';
}

export function BenefitsDashboard({ accountId, period = 'month' }: BenefitsDashboardProps) {
    const [benefits, setBenefits] = useState<BenefitProgress[]>([]);
    const [loading, setLoading] = useState(true);
    const [matching, setMatching] = useState(false);
    const [showCompleted, setShowCompleted] = useState(false);

    // New State for "Benefit Viewer Mode"
    const [selectedCard, setSelectedCard] = useState<string>('all');
    const [viewMode, setViewMode] = useState<'credits' | 'perks'>('credits');

    useEffect(() => {
        fetchBenefits();
    }, [accountId]);

    const fetchBenefits = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                ...(accountId && { accountId })
            });

            const response = await fetch(`/api/benefits/usage?${params}`);
            const data = await response.json();
            setBenefits(data.benefits || []);
        } catch (error) {
            console.error('Failed to fetch benefits:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleMatchBenefits = async () => {
        setMatching(true);
        try {
            const response = await fetch('/api/benefits/match', {
                method: 'POST'
            });
            const data = await response.json();

            if (data.matched > 0) {
                toast.success(`Matched ${data.matched} transactions to benefits!`);
                fetchBenefits(); // Refresh data
            } else {
                toast.info('No new matches found');
            }
        } catch (error) {
            console.error('Error matching benefits:', error);
            toast.error('Failed to match benefits');
        } finally {
            setMatching(false);
        }
    };

    // Derived Data
    const uniqueCards = Array.from(new Set(benefits.map(b => b.cardProductName))).map(name => {
        const benefit = benefits.find(b => b.cardProductName === name);
        return {
            name,
            issuer: benefit?.cardIssuer || 'Unknown'
        };
    });

    const filteredBenefits = benefits.filter(b => {
        const matchesCard = selectedCard === 'all' || b.cardProductName === selectedCard;
        // Statement credits (STATEMENT_CREDIT) appear on your card statement
        // External credits (EXTERNAL_CREDIT) go to external accounts (Uber, etc.)
        const isStatementCredit = b.type === 'STATEMENT_CREDIT';
        const matchesMode = viewMode === 'credits' ? isStatementCredit : !isStatementCredit;
        return matchesCard && matchesMode;
    });

    // Group by urgency
    const incompleteBenefits = filteredBenefits.filter(b => b.remainingAmount > 0);
    const completedBenefits = filteredBenefits.filter(b => b.remainingAmount <= 0);

    const urgentBenefits = incompleteBenefits.filter(b => b.daysRemaining <= 7);
    const soonBenefits = incompleteBenefits.filter(b => b.daysRemaining > 7 && b.daysRemaining <= 30);
    const upcomingBenefits = incompleteBenefits.filter(b => b.daysRemaining > 30);

    const totalEarned = benefits.reduce((sum, b) => sum + b.usedAmount, 0);
    const totalPotential = benefits.reduce((sum, b) => sum + b.maxAmount, 0);
    const leftOnTable = totalPotential - totalEarned;

    return (
        <div className="min-h-screen bg-slate-950 pb-32">
            {/* Standard App Header with Card Selector */}
            <AppHeader>
                <button
                    onClick={() => setSelectedCard('all')}
                    className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${selectedCard === 'all'
                        ? 'bg-white text-slate-900'
                        : 'bg-white/5 text-slate-400 hover:bg-white/10'
                        }`}
                >
                    All Cards
                </button>
                {uniqueCards.map((card) => (
                    <button
                        key={card.name}
                        onClick={() => setSelectedCard(card.name)}
                        className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${selectedCard === card.name
                            ? 'bg-white text-slate-900'
                            : 'bg-white/5 text-slate-400 hover:bg-white/10'
                            }`}
                    >
                        {card.name}
                    </button>
                ))}
            </AppHeader>

            <div className="px-4 pt-4">
                {/* Title & Actions Row */}
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-amber-400" />
                        Benefits
                    </h2>
                    <button
                        onClick={handleMatchBenefits}
                        disabled={matching}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${matching
                            ? 'bg-indigo-500/20 text-indigo-300'
                            : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
                            }`}
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${matching ? 'animate-spin' : ''}`} />
                        {matching ? 'Scanning...' : 'Scan'}
                    </button>
                </div>

                {/* Big Stats */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4">
                        <div className="text-emerald-400 text-xs font-medium uppercase tracking-wider mb-1">Extracted</div>
                        <div className="text-2xl font-bold text-emerald-300">
                            ${totalEarned.toLocaleString()}
                        </div>
                    </div>
                    <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4">
                        <div className="text-rose-400 text-xs font-medium uppercase tracking-wider mb-1">Missed</div>
                        <div className="text-2xl font-bold text-rose-300">
                            ${leftOnTable.toLocaleString()}
                        </div>
                    </div>
                </div>

                {/* View Mode Toggles */}
                <div className="bg-white/5 p-1 rounded-xl flex gap-1 mb-6">
                    <button
                        onClick={() => setViewMode('credits')}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${viewMode === 'credits'
                            ? 'bg-indigo-500 text-white shadow-lg'
                            : 'text-slate-400 hover:text-white'
                            }`}
                    >
                        Statement Credits
                    </button>
                    <button
                        onClick={() => setViewMode('perks')}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${viewMode === 'perks'
                            ? 'bg-indigo-500 text-white shadow-lg'
                            : 'text-slate-400 hover:text-white'
                            }`}
                    >
                        Perks & Status
                    </button>
                </div>

                {/* Urgency Groups */}
                <AnimatePresence mode="popLayout">
                    {loading ? (
                        // Skeletons
                        [...Array(3)].map((_, i) => (
                            <div key={i} className="animate-pulse bg-white/5 rounded-2xl p-4 h-24 mb-3" />
                        ))
                    ) : (
                        <>
                            {/* Urgent - Expires in 7 days */}
                            {urgentBenefits.length > 0 && (
                                <div className="mb-6">
                                    <h3 className="text-xs font-bold text-red-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                        <AlertCircle className="w-4 h-4" />
                                        Urgent - Expires This Week
                                    </h3>
                                    <div className="space-y-3">
                                        {urgentBenefits.map(benefit => (
                                            <BenefitTile key={benefit.id} benefit={benefit} urgency="urgent" />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Soon - Expires in 8-30 days */}
                            {soonBenefits.length > 0 && (
                                <div className="mb-6">
                                    <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                        <Clock className="w-4 h-4" />
                                        Soon - Expires This Month
                                    </h3>
                                    <div className="space-y-3">
                                        {soonBenefits.map(benefit => (
                                            <BenefitTile key={benefit.id} benefit={benefit} urgency="soon" />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Upcoming - Expires in 31+ days */}
                            {upcomingBenefits.length > 0 && (
                                <div className="mb-6">
                                    <h3 className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                        <TrendingUp className="w-4 h-4" />
                                        Upcoming - More Time
                                    </h3>
                                    <div className="space-y-3">
                                        {upcomingBenefits.map(benefit => (
                                            <BenefitTile key={benefit.id} benefit={benefit} urgency="upcoming" />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Completed - Collapsed by default */}
                            {completedBenefits.length > 0 && (
                                <div className="mb-6">
                                    <button
                                        onClick={() => setShowCompleted(!showCompleted)}
                                        className="w-full flex items-center justify-between text-xs font-bold text-emerald-400 uppercase tracking-wider mb-3"
                                    >
                                        <span className="flex items-center gap-2">
                                            <CheckCircle2 className="w-4 h-4" />
                                            Completed ({completedBenefits.length})
                                        </span>
                                        <ChevronRight className={`w-4 h-4 transition-transform ${showCompleted ? 'rotate-90' : ''}`} />
                                    </button>
                                    {showCompleted && (
                                        <div className="space-y-3">
                                            {completedBenefits.map(benefit => (
                                                <BenefitTile key={benefit.id} benefit={benefit} urgency="completed" />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {incompleteBenefits.length === 0 && completedBenefits.length === 0 && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="text-center py-12"
                                >
                                    <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-3">
                                        <Sparkles className="w-6 h-6 text-slate-600" />
                                    </div>
                                    <p className="text-slate-500">No {viewMode} found for this selection</p>
                                </motion.div>
                            )}
                        </>
                    )}
                </AnimatePresence>
            </div>

            <NavDock activeTab="benefits" />
        </div>
    );
}

import { TransactionSchema } from "@/lib/validations";
import type { z } from "zod";

type Transaction = z.infer<typeof TransactionSchema>;

function BenefitTile({ benefit, urgency = 'upcoming' }: { benefit: BenefitProgress; urgency?: 'urgent' | 'soon' | 'upcoming' | 'completed' }) {
    const [showTransactions, setShowTransactions] = useState(false);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loadingTx, setLoadingTx] = useState(false);

    const isCredit = benefit.maxAmount > 0;
    const isFullyUsed = isCredit && benefit.remainingAmount <= 0;
    const isUnused = isCredit && benefit.usedAmount === 0;

    const handleClick = async () => {
        setShowTransactions(true);
        setLoadingTx(true);

        try {
            const response = await fetch(`/api/benefits/transactions?benefitId=${benefit.id}`);
            const data = await response.json();
            setTransactions(data.transactions || []);
        } catch (error) {
            console.error('Failed to fetch transactions:', error);
            toast.error('Failed to load transactions');
        } finally {
            setLoadingTx(false);
        }
    };

    // Urgency colors
    const urgencyStyles = {
        urgent: 'border-red-500/30 bg-red-500/5',
        soon: 'border-amber-500/30 bg-amber-500/5',
        upcoming: 'border-white/5 bg-white/5',
        completed: 'border-emerald-500/20 bg-emerald-500/5'
    };

    const daysRemainingColor = {
        urgent: 'bg-red-500/20 text-red-300',
        soon: 'bg-amber-500/20 text-amber-300',
        upcoming: 'bg-blue-500/20 text-blue-300',
        completed: 'bg-emerald-500/20 text-emerald-300'
    };

    return (
        <>
            <motion.div
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                onClick={handleClick}
                className={`relative overflow-hidden rounded-2xl border cursor-pointer hover:scale-[1.02] transition-transform ${urgencyStyles[urgency]}`}
            >
                {/* Progress Bar Background */}
                {isCredit && !isFullyUsed && !isUnused && (
                    <div
                        className="absolute bottom-0 left-0 top-0 bg-indigo-500/10 transition-all duration-1000"
                        style={{ width: `${benefit.percentage}%` }}
                    />
                )}

                <div className="relative p-4 flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="text-xs font-medium text-slate-400 truncate max-w-[150px]">
                                {benefit.cardProductName}
                            </span>
                            {!isFullyUsed && benefit.daysRemaining !== undefined && (
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${daysRemainingColor[urgency]}`}>
                                    {benefit.daysRemaining} days left
                                </span>
                            )}
                            {isFullyUsed && (
                                <span className="bg-emerald-500/20 text-emerald-400 text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                                    COMPLETED
                                </span>
                            )}
                        </div>
                        <h3 className={`font-semibold truncate ${isFullyUsed ? 'text-emerald-300' : 'text-white'}`}>
                            {benefit.benefitName}
                        </h3>
                        <div className="text-xs text-slate-500 mt-1 capitalize">
                            {benefit.timing}ly Reset
                        </div>
                    </div>

                    <div className="text-right flex-shrink-0">
                        {isCredit ? (
                            <>
                                <div className={`text-lg font-bold ${isFullyUsed ? 'text-emerald-400' : 'text-white'}`}>
                                    ${benefit.usedAmount}
                                </div>
                                <div className="text-xs text-slate-500">
                                    of ${benefit.maxAmount}
                                </div>
                            </>
                        ) : (
                            <div className="bg-white/10 p-2 rounded-lg">
                                <Sparkles className="w-5 h-5 text-amber-400" />
                            </div>
                        )}
                    </div>
                </div>
            </motion.div>

            {/* Transaction Modal */}
            <AnimatePresence>
                {showTransactions && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowTransactions(false)}
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                        />
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 20 }}
                            className="fixed bottom-0 left-0 right-0 bg-slate-900 rounded-t-3xl border-t border-white/10 p-6 z-50 max-h-[70vh] overflow-y-auto"
                        >
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h3 className="text-lg font-bold text-white">{benefit.benefitName}</h3>
                                    <p className="text-sm text-slate-400">{benefit.cardProductName}</p>
                                </div>
                                <button
                                    onClick={() => setShowTransactions(false)}
                                    className="w-8 h-8 bg-white/5 hover:bg-white/10 rounded-full flex items-center justify-center"
                                >
                                    <ChevronRight className="w-5 h-5 text-white rotate-90" />
                                </button>
                            </div>

                            {loadingTx ? (
                                <div className="flex items-center justify-center py-12">
                                    <RefreshCw className="w-6 h-6 text-slate-500 animate-spin" />
                                </div>
                            ) : transactions.length === 0 ? (
                                <div className="text-center py-12">
                                    <p className="text-slate-500">No transactions found</p>
                                </div>
                            ) : (() => {
                                // Group transactions by period
                                const groupedByPeriod: { [key: string]: Transaction[] } = {};

                                transactions.forEach((tx: Transaction) => {
                                    const date = new Date(tx.date);
                                    let periodKey = '';

                                    if (benefit.timing === 'Monthly') {
                                        periodKey = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                                    } else if (benefit.timing === 'Quarterly') {
                                        const quarter = Math.floor(date.getMonth() / 3) + 1;
                                        periodKey = `Q${quarter} ${date.getFullYear()}`;
                                    } else if (benefit.timing === 'SemiAnnually') {
                                        const half = date.getMonth() < 6 ? 'H1' : 'H2';
                                        periodKey = `${half} ${date.getFullYear()}`;
                                    } else {
                                        periodKey = date.getFullYear().toString();
                                    }

                                    if (!groupedByPeriod[periodKey]) {
                                        groupedByPeriod[periodKey] = [];
                                    }
                                    groupedByPeriod[periodKey].push(tx);
                                });

                                // Sort periods (newest first)
                                const sortedPeriods = Object.keys(groupedByPeriod).sort((a, b) => {
                                    const aDate = groupedByPeriod[a][0].date;
                                    const bDate = groupedByPeriod[b][0].date;
                                    return new Date(bDate).getTime() - new Date(aDate).getTime();
                                });

                                return (
                                    <div className="space-y-4">
                                        {sortedPeriods.map((period) => {
                                            const periodTransactions = groupedByPeriod[period];
                                            const periodTotal = periodTransactions.reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

                                            return (
                                                <div key={period}>
                                                    {/* Period Header - Enhanced */}
                                                    <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-3 mb-3 flex items-center justify-between">
                                                        <h4 className="text-sm font-bold text-white tracking-wide">
                                                            {period}
                                                        </h4>
                                                        <span className="text-lg font-bold text-emerald-400">
                                                            ${periodTotal.toFixed(2)}
                                                        </span>
                                                    </div>

                                                    {/* Transactions in this period */}
                                                    <div className="space-y-2 mb-4">
                                                        {periodTransactions.map((tx: Transaction) => (
                                                            <div key={tx.id} className="bg-white/5 rounded-xl p-3 flex items-center justify-between ml-2">
                                                                <div className="flex-1">
                                                                    <p className="text-sm font-medium text-white">{tx.name}</p>
                                                                    <p className="text-xs text-slate-500">
                                                                        {new Date(tx.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                                    </p>
                                                                </div>
                                                                <div className="text-right">
                                                                    <p className="text-sm font-bold text-emerald-400">
                                                                        ${Math.abs(tx.amount).toFixed(2)}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                );
                            })()}

                            <div className="mt-6 pt-4 border-t border-white/10">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-slate-400">Total Credits</span>
                                    <span className="font-bold text-white">${benefit.usedAmount.toFixed(2)}</span>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
}
