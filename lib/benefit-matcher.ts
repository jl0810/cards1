import { db, schema, eq, and, or, gte, lte, isNull, inArray, sql } from "@/db";

/**
 * Benefit matching rules for Amex Platinum Schwab and other premium cards
 * Each benefit has matching criteria based on merchant name, category, and amount
 *
 * @module lib/benefit-matcher
 * @implements BR-017 - Merchant Pattern Matching
 * @implements BR-018 - Category-Based Matching
 * @implements BR-019 - Amount Guard Rails
 * @implements BR-020 - Monthly and Annual Limits
 * @satisfies US-010 - Match Transactions to Benefits
 * @tested __tests__/lib/benefit-matcher.test.ts
 */

export interface BenefitMatchCriteria {
  benefitId: string;
  benefitName: string;
  merchantPatterns: string[]; // Regex patterns to match merchants
  categories?: string[]; // Transaction categories that qualify
  minAmount?: number;
  maxAmount?: number;
  monthlyLimit?: number; // Max credit per month
  annualLimit?: number; // Max credit per year
}

/**
 * Type for benefit match result
 */
export interface BenefitMatch {
  benefit: {
    id: string;
    benefitName: string;
    type: string;
    description?: string | null;
    timing: string;
    maxAmount?: number | null;
    keywords: string[];
    ruleConfig?: Record<string, unknown> | null;
    active: boolean;
    cardProductId: string;
    createdAt: Date;
    updatedAt: Date;
  };
  confidence: number;
  matchReason: string;
}

/**
 * Type for benefit in trackEvent calls
 */
export interface BenefitEvent {
  id: string;
  timing: string;
  maxAmount: number | null;
}

/**
 * Type for Prisma where clause
 */
type PlaidAccountWhereClause = {
  extended: {
    cardProductId: { not: null };
  };
  accountId?: { in: string[] };
  plaidItem?: { userId: string };
};

// Define matching rules for known benefits
export const BENEFIT_MATCHING_RULES: Record<string, BenefitMatchCriteria[]> = {
  // Amex Platinum Schwab benefits
  uber: [
    {
      benefitId: "uber_cash",
      benefitName: "Uber Cash Credit",
      merchantPatterns: ["uber", "uber eats", "ubereats"],
      monthlyLimit: 15, // $15/month, $20 in Dec
      annualLimit: 200,
    },
  ],
  saks: [
    {
      benefitId: "saks_credit",
      benefitName: "Saks Fifth Avenue Credit",
      merchantPatterns: ["saks fifth avenue", "saks\\.com", "saksfifthavenue"],
      monthlyLimit: 50, // $50 every 6 months
      annualLimit: 100,
    },
  ],
  airline: [
    {
      benefitId: "airline_credit",
      benefitName: "Airline Incidental Fee Credit",
      merchantPatterns: [
        "american airlines",
        "delta air lines",
        "united airlines",
        "southwest airlines",
        "jetblue",
        "alaska airlines",
      ],
      categories: ["Travel", "Airlines"],
      maxAmount: 200, // Must select airline, $200/year
      annualLimit: 200,
    },
  ],
  digital_entertainment: [
    {
      benefitId: "digital_entertainment",
      benefitName: "Digital Entertainment Credit",
      merchantPatterns: [
        "audible",
        "disney\\+",
        "disney plus",
        "peacock",
        "hulu",
        "espn\\+",
        "nyt",
        "new york times",
      ],
      monthlyLimit: 20,
      annualLimit: 240,
    },
  ],
  walmart: [
    {
      benefitId: "walmart_plus",
      benefitName: "Walmart+ Membership Credit",
      merchantPatterns: [
        "walmart",
        "walmart\\.com",
        "walmart plus",
        "walmart\\+",
      ],
      monthlyLimit: 12.95,
      annualLimit: 155.4,
      minAmount: 12.0, // Guardrail: $12.95 + tax
      maxAmount: 16.0,
    },
  ],
  hotel: [
    {
      benefitId: "hotel_credit",
      benefitName: "Prepaid Hotel Credit",
      merchantPatterns: [
        "fine hotels",
        "hotel collection",
        "amex travel",
        "amextravel",
      ],
      annualLimit: 200,
    },
  ],
};

/**
 * Match a transaction to potential card benefits
 */
export async function matchTransactionToBenefits(transaction: {
  id: string;
  name: string;
  merchantName: string | null;
  originalDescription?: string | null;
  category: string | null;
  amount: number;
  date: Date;
  plaidAccountId: string;
}) {
  // 1. CRITICAL: Only match credits (negative amounts)
  // Positive amounts are expenses, negative amounts are credits/reimbursements
  if (transaction.amount >= 0) {
    return null;
  }

  // Get the account's linked card product and its benefits using Drizzle
  const account = await db.query.plaidAccounts.findFirst({
    where: eq(schema.plaidAccounts.accountId, transaction.plaidAccountId),
    with: {
      extended: {
        with: {
          cardProduct: {
            with: {
              benefits: true,
            },
          },
        },
      },
    },
  });

  if (!account?.extended?.cardProduct) {
    return null; // No card product linked
  }

  const cardBenefits = account.extended.cardProduct.benefits;
  const transactionName = (
    transaction.merchantName || transaction.name
  ).toLowerCase();
  const originalDesc = (transaction.originalDescription || "").toLowerCase();

  const matches: BenefitMatch[] = [];

  // Check each benefit using DB keywords
  for (const benefit of cardBenefits) {
    const keywords = benefit.keywords || [];

    // Find if any keyword matches the transaction name OR original description
    const matchedKeyword = keywords.find((k: string) => {
      const keyword = k.toLowerCase();
      return (
        transactionName.includes(keyword) || originalDesc.includes(keyword)
      );
    });

    if (matchedKeyword) {
      // Apply ruleConfig validation if it exists
      if (benefit.ruleConfig) {
        const rules = benefit.ruleConfig as {
          minAmount?: number;
          maxAmount?: number;
        };
        const absAmount = Math.abs(transaction.amount);

        if (rules.minAmount && absAmount < rules.minAmount) continue;
        if (rules.maxAmount && absAmount > rules.maxAmount) continue;
      }

      matches.push({
        benefit: {
          ...benefit,
          keywords: benefit.keywords || [],
          ruleConfig: benefit.ruleConfig as Record<string, unknown> | null,
          maxAmount: benefit.maxAmount ?? null,
        },
        confidence: 0.8,
        matchReason: `Keyword match: "${matchedKeyword}"`,
      });
    }
  }

  return matches;
}

/**
 * Check if a benefit still has available capacity for the period
 */
async function _checkBenefitUtilization(
  cardBenefitId: string,
  transactionDate: Date,
  monthlyLimit?: number,
  annualLimit?: number,
) {
  const year = transactionDate.getFullYear();
  const month = transactionDate.getMonth();

  // Get or create usage tracking for this period
  let monthlyUsed = 0;
  if (monthlyLimit) {
    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0);

    const monthUsage = await db.query.benefitUsage.findFirst({
      where: and(
        eq(schema.benefitUsage.cardBenefitId, cardBenefitId),
        gte(schema.benefitUsage.periodStart, monthStart),
        lte(schema.benefitUsage.periodEnd, monthEnd),
      ),
    });

    monthlyUsed = monthUsage?.usedAmount || 0;
  }

  // Check annual usage
  let annualUsed = 0;
  if (annualLimit) {
    const yearStart = new Date(year, 0, 1);
    const yearEnd = new Date(year, 11, 31);

    const yearUsage = await db.query.benefitUsage.findFirst({
      where: and(
        eq(schema.benefitUsage.cardBenefitId, cardBenefitId),
        gte(schema.benefitUsage.periodStart, yearStart),
        lte(schema.benefitUsage.periodEnd, yearEnd),
      ),
    });

    annualUsed = yearUsage?.usedAmount || 0;
  }

  return {
    hasCapacity:
      (!monthlyLimit || monthlyUsed < monthlyLimit) &&
      (!annualLimit || annualUsed < annualLimit),
    monthlyUsed,
    monthlyRemaining: monthlyLimit ? monthlyLimit - monthlyUsed : null,
    annualUsed,
    annualRemaining: annualLimit ? annualLimit - annualUsed : null,
  };
}

/**
 * Link a transaction to a matched benefit
 * This just creates the TransactionExtended linkage
 * The BenefitUsage tracking is updated separately
 */
export async function linkTransactionToBenefit(
  transaction: {
    id: string;
    date: Date;
    amount: number;
    plaidAccountId: string;
  },
  benefit: { id: string; timing: string; maxAmount: number | null },
  matchReason: string,
) {
  return await db.transaction(async (tx) => {
    // 1. Link Transaction
    const [txExtended] = await tx.insert(schema.transactionExtended)
      .values({
        plaidTransactionId: transaction.id,
        matchedBenefitId: benefit.id,
        notes: matchReason,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: schema.transactionExtended.plaidTransactionId,
        set: {
          matchedBenefitId: benefit.id,
          notes: matchReason,
          updatedAt: new Date(),
        },
      })
      .returning();

    // 2. Update BenefitUsage
    const date = new Date(transaction.date);
    let periodStart: Date;
    let periodEnd: Date;

    if (benefit.timing === "Monthly") {
      periodStart = new Date(date.getFullYear(), date.getMonth(), 1);
      periodEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    } else if (benefit.timing === "Quarterly") {
      // Calculate quarter (Q1: 0-2, Q2: 3-5, Q3: 6-8, Q4: 9-11)
      const quarter = Math.floor(date.getMonth() / 3);
      periodStart = new Date(date.getFullYear(), quarter * 3, 1);
      periodEnd = new Date(date.getFullYear(), quarter * 3 + 3, 0);
    } else if (benefit.timing === "SemiAnnually") {
      // Two periods: Jan-Jun (0-5) and Jul-Dec (6-11)
      const half = date.getMonth() < 6 ? 0 : 6;
      periodStart = new Date(date.getFullYear(), half, 1);
      periodEnd = new Date(date.getFullYear(), half + 6, 0);
    } else {
      // Annual or others default to Year
      periodStart = new Date(date.getFullYear(), 0, 1);
      periodEnd = new Date(date.getFullYear(), 11, 31);
    }

    // Find existing usage to update or create new
    const existingUsage = await tx.query.benefitUsage.findFirst({
      where: and(
        eq(schema.benefitUsage.cardBenefitId, benefit.id),
        eq(schema.benefitUsage.plaidAccountId, transaction.plaidAccountId),
        lte(schema.benefitUsage.periodStart, date),
        gte(schema.benefitUsage.periodEnd, date),
      ),
    });

    const amountToAdd = Math.abs(transaction.amount);

    if (existingUsage) {
      await tx.update(schema.benefitUsage)
        .set({
          usedAmount: sql`${schema.benefitUsage.usedAmount} + ${amountToAdd}`,
          remainingAmount: benefit.maxAmount
            ? sql`${schema.benefitUsage.remainingAmount} - ${amountToAdd}`
            : schema.benefitUsage.remainingAmount,
          updatedAt: new Date(),
        })
        .where(eq(schema.benefitUsage.id, existingUsage.id));
    } else {
      const maxAmount = benefit.maxAmount || 0;
      const remainingAmount =
        maxAmount > 0 ? Math.max(0, maxAmount - amountToAdd) : 0;

      await tx.insert(schema.benefitUsage)
        .values({
          cardBenefitId: benefit.id,
          plaidAccountId: transaction.plaidAccountId,
          periodStart,
          periodEnd,
          usedAmount: amountToAdd,
          maxAmount: maxAmount,
          remainingAmount: remainingAmount,
        });
    }

    return txExtended;
  });
}

/**
 * Get benefit usage summary for a card benefit in a period
 */
export async function getBenefitUsageSummary(
  cardBenefitId: string,
  periodStart: Date,
  periodEnd: Date,
) {
  const usage = await db.query.benefitUsage.findFirst({
    where: and(
      eq(schema.benefitUsage.cardBenefitId, cardBenefitId),
      lte(schema.benefitUsage.periodStart, periodStart),
      gte(schema.benefitUsage.periodEnd, periodEnd),
    ),
    with: {
      cardBenefit: true,
    },
  });

  return usage;
}
/**
 * Scan and match all unmatched transactions for a user or specific accounts
 * This handles backfilling matches for historical transactions
 */
export async function scanAndMatchBenefits(
  userId: string,
  specificAccountIds?: string[],
) {
  // Get user profile to ensure valid user (supabaseId)
  const userProfile = await db.query.userProfiles.findFirst({
    where: eq(schema.userProfiles.supabaseId, userId),
  });

  if (!userProfile) return { matched: 0, checked: 0 };

  // Get accounts to check
  let linkedAccounts;
  if (specificAccountIds && specificAccountIds.length > 0) {
    linkedAccounts = await db.query.plaidAccounts.findMany({
      where: and(
        inArray(schema.plaidAccounts.accountId, specificAccountIds),
        sql`${schema.accountExtended.cardProductId} IS NOT NULL`
      ),
      with: {
        extended: {
          with: {
            cardProduct: {
              with: {
                benefits: true,
              },
            },
          },
        },
      }
    });
  } else {
    // Filter by joining with plaidItems to get userId
    const results = await db.select()
      .from(schema.plaidAccounts)
      .innerJoin(schema.plaidItems, eq(schema.plaidAccounts.plaidItemId, schema.plaidItems.id))
      .leftJoin(schema.accountExtended, eq(schema.plaidAccounts.id, schema.accountExtended.plaidAccountId))
      .where(and(
        eq(schema.plaidItems.userId, userProfile.id),
        sql`${schema.accountExtended.cardProductId} IS NOT NULL`
      ));

    // We need to fetch the relations for these accounts.
    // It's easier to just use the IDs we found.
    const accountIds = results.map(r => r.plaid_accounts.id);
    if (accountIds.length === 0) return { matched: 0, checked: 0 };

    linkedAccounts = await db.query.plaidAccounts.findMany({
      where: inArray(schema.plaidAccounts.id, accountIds),
      with: {
        extended: {
          with: {
            cardProduct: {
              with: {
                benefits: true,
              },
            },
          },
        },
      }
    });
  }

  if (linkedAccounts.length === 0) return { matched: 0, checked: 0 };

  const accountMap = new Map<string, string>();
  linkedAccounts.forEach((a: any) => accountMap.set(a.accountId, a.id));

  const accountIds = linkedAccounts.map((a: any) => a.accountId);

  // Find unmatched transactions
  // 1. No extended record
  // 2. Extended record but no match
  // We want transactions where transaction_extended is null OR transaction_extended.matched_benefit_id is null
  const allUnmatchedTransactions = await db.select()
    .from(schema.plaidTransactions)
    .leftJoin(schema.transactionExtended, eq(schema.plaidTransactions.id, schema.transactionExtended.plaidTransactionId))
    .where(and(
      inArray(schema.plaidTransactions.accountId, accountIds),
      or(
        isNull(schema.transactionExtended.plaidTransactionId),
        isNull(schema.transactionExtended.matchedBenefitId)
      )
    ))
    .orderBy(schema.plaidTransactions.date)
    .limit(1000);

  let matchCount = 0;

  console.log(
    `🔄 Auto-Scanning ${allUnmatchedTransactions.length} transactions for benefits...`,
  );

  for (const row of allUnmatchedTransactions) {
    const transaction = row.plaid_transactions;
    try {
      const matches = await matchTransactionToBenefits({
        id: transaction.id,
        name: transaction.name,
        merchantName: transaction.merchantName,
        originalDescription: transaction.originalDescription,
        category: transaction.category?.[0] || null,
        amount: Number(transaction.amount),
        date: transaction.date,
        plaidAccountId: transaction.accountId,
      });

      if (matches && matches.length > 0) {
        const bestMatch = matches[0];
        const internalAccountId = accountMap.get(transaction.accountId);

        if (internalAccountId) {
          await linkTransactionToBenefit(
            {
              id: transaction.id,
              date: transaction.date,
              amount: Number(transaction.amount),
              plaidAccountId: internalAccountId,
            },
            {
              id: bestMatch.benefit.id,
              timing: bestMatch.benefit.timing,
              maxAmount: bestMatch.benefit.maxAmount ?? null,
            },
            bestMatch.matchReason,
          );
          matchCount++;
          console.log(
            `  ✅ Matched (Backfill): ${transaction.merchantName || transaction.name} → ${bestMatch.benefit.benefitName}`,
          );
        }
      } else {
        // Mark as checked
        await db.insert(schema.transactionExtended)
          .values({
            plaidTransactionId: transaction.id,
            notes: "Checked - no benefit match",
            updatedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: schema.transactionExtended.plaidTransactionId,
            set: {
              notes: "Checked - no benefit match",
              updatedAt: new Date(),
            },
          });
      }
    } catch (error) {
      console.error(`Error matching transaction ${transaction.id}:`, error);
    }
  }

  return { matched: matchCount, checked: allUnmatchedTransactions.length };
}
