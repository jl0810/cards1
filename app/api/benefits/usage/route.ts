/**
 * Benefit Usage Tracking API
 * Calculates and returns benefit usage for user's credit cards
 * 
 * @module app/api/benefits/usage
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, schema, eq, and, inArray, gte, isNotNull } from "@/db";
import { Errors } from "@/lib/api-errors";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * Get benefit usage for user's cards
 * 
 * @route GET /api/benefits/usage?period=month&accountId=xxx
 * @implements BR-021 - Benefit Period Calculation
 * @implements BR-022 - Usage Percentage Calculation
 * @implements BR-023 - Urgency-Based Sorting
 */
export async function GET(req: Request) {
    const session = await auth();
    const user = session?.user;

    if (!user?.id) {
        return Errors.unauthorized();
    }

    const { searchParams } = new URL(req.url);
    const period = searchParams.get("period") || "month"; // month, quarter, year
    const accountId = searchParams.get("accountId");

    // Calculate period dates
    const now = new Date();
    let periodStart: Date;
    let periodEnd: Date;

    switch (period) {
        case "quarter":
            const quarter = Math.floor(now.getMonth() / 3);
            periodStart = new Date(now.getFullYear(), quarter * 3, 1);
            periodEnd = new Date(now.getFullYear(), (quarter + 1) * 3, 0);
            break;
        case "year":
            periodStart = new Date(now.getFullYear(), 0, 1);
            periodEnd = new Date(now.getFullYear(), 11, 31);
            break;
        default: // month
            periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
            periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    }

    try {
        // Get user profile
        const userProfile = await db.query.userProfiles.findFirst({
            where: eq(schema.userProfiles.supabaseId, user.id)
        });

        if (!userProfile) {
            return Errors.notFound("User profile");
        }

        // Get linked accounts using Drizzle
        const accounts = await db.query.plaidAccounts.findMany({
            where: and(
                accountId ? eq(schema.plaidAccounts.id, accountId) : undefined,
                inArray(
                    schema.plaidAccounts.plaidItemId,
                    db.select({ id: schema.plaidItems.id })
                        .from(schema.plaidItems)
                        .where(eq(schema.plaidItems.userId, userProfile.id))
                )
            ),
            with: {
                extended: {
                    with: {
                        cardProduct: {
                            with: {
                                benefits: {
                                    where: eq(schema.cardBenefits.active, true)
                                }
                            }
                        }
                    }
                }
            }
        });

        // Filter accounts that have card products
        const validAccounts = accounts.filter(a => a.extended?.cardProduct);

        // Collect all unique benefits from linked cards
        const benefitDataMap = new Map();

        validAccounts.forEach(account => {
            const cardProduct = account.extended?.cardProduct;
            if (!cardProduct) return;

            cardProduct.benefits.forEach(benefit => {
                if (!benefitDataMap.has(benefit.id)) {
                    benefitDataMap.set(benefit.id, {
                        ...benefit,
                        cardProductName: cardProduct.productName,
                        cardIssuer: cardProduct.issuer,
                        accountId: account.id
                    });
                }
            });
        });

        const accountIds = validAccounts.map(a => a.id);
        const benefitIds = Array.from(benefitDataMap.keys());

        if (benefitIds.length === 0) {
            return NextResponse.json({
                benefits: [],
                period,
                periodStart,
                periodEnd
            });
        }

        // Get usage records using Drizzle
        const usages = await db.query.benefitUsage.findMany({
            where: and(
                inArray(schema.benefitUsage.cardBenefitId, benefitIds),
                inArray(schema.benefitUsage.plaidAccountId, accountIds),
                gte(schema.benefitUsage.periodEnd, now)
            ),
            with: {
                matchedTransactions: {
                    with: {
                        plaidTransaction: true
                    }
                }
            }
        });

        const benefitProgress = Array.from(benefitDataMap.values()).map((benefit) => {
            const relevantUsages = usages.filter(u => u.cardBenefitId === benefit.id);
            const usedAmount = relevantUsages.reduce((sum, u) => sum + u.usedAmount, 0);
            const maxAmount = benefit.maxAmount || 0;
            const remainingAmount = Math.max(0, maxAmount - usedAmount);
            const percentage = maxAmount > 0 ? (usedAmount / maxAmount) * 100 : 0;

            const allTransactions = relevantUsages.flatMap(u => u.matchedTransactions || []);
            allTransactions.sort((a, b) => {
                return new Date(b.plaidTransaction.date).getTime() - new Date(a.plaidTransaction.date).getTime();
            });

            const actualPeriodEnd = relevantUsages.length > 0
                ? relevantUsages[0].periodEnd
                : (() => {
                    if (benefit.timing === "Monthly") return new Date(now.getFullYear(), now.getMonth() + 1, 0);
                    if (benefit.timing === "Quarterly") {
                        const q = Math.floor(now.getMonth() / 3);
                        return new Date(now.getFullYear(), (q + 1) * 3, 0);
                    }
                    return new Date(now.getFullYear(), 11, 31);
                })();

            const daysRemaining = Math.max(0, Math.ceil((actualPeriodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

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
        });

        // Sort by urgency
        benefitProgress.sort((a, b) => {
            const aCompleted = a.remainingAmount <= 0;
            const bCompleted = b.remainingAmount <= 0;
            if (aCompleted !== bCompleted) return aCompleted ? 1 : -1;
            if (!aCompleted && a.daysRemaining !== b.daysRemaining) return a.daysRemaining - b.daysRemaining;
            return b.remainingAmount - a.remainingAmount;
        });

        return NextResponse.json({
            benefits: benefitProgress,
            period,
            periodStart,
            periodEnd
        });

    } catch (error) {
        logger.error("Error fetching benefit usage", error, { userId: user.id, period, accountId });
        return Errors.internal();
    }
}
