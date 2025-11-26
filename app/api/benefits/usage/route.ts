/**
 * Benefit Usage Tracking API
 * Calculates and returns benefit usage for user's credit cards
 * 
 * @module app/api/benefits/usage
 */

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { Errors } from '@/lib/api-errors';
import { logger } from '@/lib/logger';

/**
 * Get benefit usage for user's cards
 * 
 * @route GET /api/benefits/usage?period=month&accountId=xxx
 * @implements BR-021 - Benefit Period Calculation
 * @implements BR-022 - Usage Percentage Calculation
 * @implements BR-023 - Urgency-Based Sorting
 * @satisfies US-011 - View Benefit Usage
 * @tested __tests__/api/benefits/usage.test.ts
 * 
 * @param {Request} req - Query params: period (month/quarter/year), accountId (optional)
 * @returns {Promise<NextResponse>} Benefit usage data with progress and remaining amounts
 */
export async function GET(req: Request) {
    const { userId } = await auth();

    if (!userId) {
        return Errors.unauthorized();
    }

    const { searchParams } = new URL(req.url);
    const period = searchParams.get('period') || 'month'; // month, quarter, year
    const accountId = searchParams.get('accountId');

    // Calculate period dates
    const now = new Date();
    let periodStart: Date;
    let periodEnd: Date;

    switch (period) {
        case 'quarter':
            const quarter = Math.floor(now.getMonth() / 3);
            periodStart = new Date(now.getFullYear(), quarter * 3, 1);
            periodEnd = new Date(now.getFullYear(), (quarter + 1) * 3, 0);
            break;
        case 'year':
            periodStart = new Date(now.getFullYear(), 0, 1);
            periodEnd = new Date(now.getFullYear(), 11, 31);
            break;
        default: // month
            periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
            periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    }

    try {
        // Get user profile
        const userProfile = await prisma.userProfile.findUnique({
            where: { clerkId: userId }
        });

        if (!userProfile) {
            return Errors.notFound('User profile');
        }

        // Get all linked accounts (or specific account if provided)
        const accounts = await prisma.plaidAccount.findMany({
            where: {
                ...(accountId ? { id: accountId } : {}),
                plaidItem: {
                    userId: userProfile.id
                },
                extended: {
                    cardProduct: {
                        isNot: null
                    }
                }
            },
            include: {
                extended: {
                    include: {
                        cardProduct: {
                            include: {
                                benefits: {
                                    where: {
                                        active: true
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });

        // Collect all unique benefits from linked cards
        const benefits = new Map<string, any>();

        accounts.forEach(account => {
            const cardProduct = account.extended?.cardProduct;
            if (!cardProduct) return;

            cardProduct.benefits.forEach(benefit => {
                if (!benefits.has(benefit.id)) {
                    benefits.set(benefit.id, {
                        ...benefit,
                        cardProductName: cardProduct.productName,
                        cardIssuer: cardProduct.issuer,
                        accountId: account.id
                    });
                }
            });
        });

        // Get usage data for each benefit - show ALL active periods
        const accountIds = accounts.map(a => a.id);

        const benefitProgress = await Promise.all(
            Array.from(benefits.values()).map(async (benefit) => {
                // Get ALL current usage records for this benefit (any active period)
                const usages = await prisma.benefitUsage.findMany({
                    where: {
                        cardBenefitId: benefit.id,
                        plaidAccountId: { in: accountIds },
                        periodEnd: { gte: now } // Only show periods that haven't ended yet
                    },
                    include: {
                        transactionExtensions: {
                            include: {
                                plaidTransaction: true
                            }
                        }
                    }
                });

                const usedAmount = usages.reduce((sum, u) => sum + u.usedAmount, 0);

                // Use the benefit's natural max amount (no period multipliers)
                const maxAmount = benefit.maxAmount || 0;

                const remainingAmount = Math.max(0, maxAmount - usedAmount);
                const percentage = maxAmount > 0 ? (usedAmount / maxAmount) * 100 : 0;

                // Collect all transactions
                const allTransactions = usages.flatMap(u => u.transactionExtensions || []);

                // Sort transactions by date desc
                allTransactions.sort((a, b) => {
                    const dateA = new Date(a.plaidTransaction.date).getTime();
                    const dateB = new Date(b.plaidTransaction.date).getTime();
                    return dateB - dateA;
                });

                // Get the actual period end from usage records (they know the real benefit period)
                const actualPeriodEnd = usages.length > 0
                    ? usages[0].periodEnd
                    : (() => {
                        // Fallback: calculate based on benefit timing
                        if (benefit.timing === 'Monthly') {
                            return new Date(now.getFullYear(), now.getMonth() + 1, 0);
                        } else if (benefit.timing === 'Quarterly') {
                            const quarter = Math.floor(now.getMonth() / 3);
                            return new Date(now.getFullYear(), (quarter + 1) * 3, 0);
                        } else if (benefit.timing === 'SemiAnnually') {
                            const half = now.getMonth() < 6 ? 5 : 11;
                            return new Date(now.getFullYear(), half + 1, 0);
                        } else {
                            return new Date(now.getFullYear(), 11, 31);
                        }
                    })();

                const daysRemaining = Math.ceil((actualPeriodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

                return {
                    id: benefit.id,
                    benefitName: benefit.benefitName,
                    cardProductName: benefit.cardProductName,
                    cardIssuer: benefit.cardIssuer,
                    type: benefit.type,
                    timing: benefit.timing,
                    maxAmount,
                    usedAmount,
                    remainingAmount,
                    percentage,
                    transactionCount: allTransactions.length,
                    lastUsed: allTransactions[0]?.plaidTransaction?.date,
                    periodEnd: actualPeriodEnd,
                    daysRemaining
                };
            })
        );

        // Sort by urgency: days remaining (ascending), then by unused amount (descending)
        benefitProgress.sort((a, b) => {
            // Completed benefits go to the end
            const aCompleted = a.remainingAmount <= 0;
            const bCompleted = b.remainingAmount <= 0;

            if (aCompleted !== bCompleted) {
                return aCompleted ? 1 : -1;
            }

            // For incomplete benefits, sort by days remaining
            if (!aCompleted && a.daysRemaining !== b.daysRemaining) {
                return a.daysRemaining - b.daysRemaining;
            }

            // Then by remaining amount (higher remaining = more urgent)
            return b.remainingAmount - a.remainingAmount;
        });

        return NextResponse.json({
            benefits: benefitProgress,
            period,
            periodStart,
            periodEnd
        });

    } catch (error) {
        logger.error('Error fetching benefit usage', error, { userId, period, accountId });
        return Errors.internal();
    }
}
