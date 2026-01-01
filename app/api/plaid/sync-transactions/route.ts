/**
 * Plaid Transaction Sync API
 * Syncs transactions from Plaid and matches to credit card benefits
 *
 * @module app/api/plaid/sync-transactions
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { plaidClient } from "@/lib/plaid";
import type { AccountBase, CreditCardLiability } from "plaid";
import { db, schema, eq, sql } from "@/db";
import { revalidatePath } from "next/cache";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { scanAndMatchBenefits } from "@/lib/benefit-matcher";
import { logger } from "@/lib/logger";
import { PLAID_SYNC_CONFIG } from "@/lib/constants";
import { validateBody } from "@/lib/validation-middleware";
import { z } from "zod";

/**
 * Plaid Transaction Sync schemas
 */
export const SyncTransactionsSchema = z.object({
  itemId: z.string().min(1, "Invalid item ID"),
  cursor: z.string().optional(),
  count: z.number().min(1).max(500).optional().default(100),
});

export interface PlaidTransaction {
  transaction_id: string;
  account_id: string;
  amount: number;
  date: string;
  name: string;
  merchant_name?: string | null;
  category?: string[] | null;
  pending: boolean;
  original_description?: string | null;
  payment_channel?: string | null;
  transaction_code?: string | null;
  personal_finance_category?: {
    primary?: string | null;
    detailed?: string | null;
  } | null;
}

export interface PlaidBalance {
  account_id: string;
  balance: {
    current: number;
    available: number;
    limit?: number;
  };
}

/**
 * Sync transactions from Plaid for a specific item
 *
 * @route POST /api/plaid/sync-transactions
 * @implements BR-011 - Transaction Sync Limits
 * @implements BR-012 - Transaction Sync Rate Limiting
 * @implements BR-013 - Atomic Transaction Processing
 * @satisfies US-007 - Sync Transactions
 * @tested None (needs integration test)
 *
 * @param {Request} req - Contains itemId and optional cursor
 * @returns {Promise<NextResponse>} Sync statistics (added, modified, removed, hasMore)
 */
export async function POST(req: NextRequest) {
  // Apply rate limiting: max 10 syncs per hour per user
  const limited = await rateLimit(req, RATE_LIMITS.plaidSync);
  if (limited) {
    return new Response(
      JSON.stringify({
        error: "Too many sync requests",
        message: "Please wait before syncing again. Limit: 10 syncs per hour.",
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": "3600",
        },
      },
    );
  }

  try {
    const session = await auth();
    const user = session?.user;

    if (!user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Validate request body
    const bodyValidation = await validateBody(SyncTransactionsSchema, req);
    if (!bodyValidation.success) {
      return bodyValidation.error;
    }

    const { itemId, cursor } = bodyValidation.data;

    // 1. Get PlaidItem to find the secret ID
    const item = await db.query.plaidItems.findFirst({
      where: eq(schema.plaidItems.id, itemId),
    });

    if (!item) {
      return new NextResponse("Item not found", { status: 404 });
    }

    // 2. Retrieve Access Token from Vault
    // We use a raw query to select from the vault.decrypted_secrets view
    const secretId = item.accessTokenId;
    const vaultResult = await db.execute(sql`
      SELECT decrypted_secret FROM vault.decrypted_secrets WHERE id = ${secretId}::uuid;
    `);

    const accessToken = (vaultResult as unknown as { decrypted_secret: string }[])[0]?.decrypted_secret;

    if (!accessToken) {
      return new NextResponse("Failed to retrieve access token", {
        status: 500,
      });
    }

    // --- SYNC TRANSACTIONS ---
    let hasMore = true;
    let nextCursor = cursor || item.nextCursor; // Use stored cursor if not provided
    let added: PlaidTransaction[] = [];
    let modified: PlaidTransaction[] = [];
    let removed: string[] = [];
    let iterations = 0;

    // Fetch all updates since cursor (with safety limits)
    while (hasMore && iterations < PLAID_SYNC_CONFIG.MAX_ITERATIONS) {
      try {
        const response = await plaidClient.transactionsSync({
          access_token: accessToken,
          cursor: nextCursor || undefined,
        });

        const data = response.data;
        added = added.concat(data.added as unknown as PlaidTransaction[]);
        modified = modified.concat(data.modified as unknown as PlaidTransaction[]);
        removed = removed.concat(data.removed.map((r) => r.transaction_id));
        hasMore = data.has_more;
        nextCursor = data.next_cursor;
        iterations++;
      } catch (syncError) {
        const plaidError = (
          syncError as { response?: { data?: { error_code?: string } } }
        )?.response?.data;

        // Handle terminal errors
        if (plaidError?.error_code === "ITEM_NOT_FOUND") {
          logger.error("Item not found (revoked), marking as disconnected", {
            itemId,
          });
          await db.update(schema.plaidItems)
            .set({ status: "disconnected", updatedAt: new Date() })
            .where(eq(schema.plaidItems.id, itemId));
          hasMore = false; // Stop syncing
          break; // Exit loop
        }

        // Handle re-auth errors
        if (plaidError?.error_code === "ITEM_LOGIN_REQUIRED") {
          logger.warn("Item requires re-login", { itemId });
          await db.update(schema.plaidItems)
            .set({ status: "needs_reauth", updatedAt: new Date() })
            .where(eq(schema.plaidItems.id, itemId));
          hasMore = false;
          break;
        }

        logger.error("Error on sync iteration", syncError, {
          iteration: iterations,
          itemId,
        });
        // Stop syncing but don't fail completely - partial sync is better than nothing
        hasMore = false;
      }
    }

    if (iterations >= PLAID_SYNC_CONFIG.MAX_ITERATIONS) {
      logger.warn("Transaction sync hit maximum iterations", {
        maxIterations: PLAID_SYNC_CONFIG.MAX_ITERATIONS,
        itemId,
      });
    }

    // BUG FIX #4: Get account data and liabilities in single call (no balances call needed)
    // We need full account details to create missing accounts (self-healing)
    let accountsData: AccountBase[] = [];
    const liabilitiesMap = new Map<string, CreditCardLiability>();
    try {
      const liabilitiesResponse = await plaidClient.liabilitiesGet({
        access_token: accessToken,
      });
      accountsData = liabilitiesResponse.data.accounts;

      // Map liabilities by account_id for easy lookup
      if (liabilitiesResponse.data.liabilities?.credit) {
        for (const credit of liabilitiesResponse.data.liabilities.credit) {
          if (credit.account_id) {
            liabilitiesMap.set(credit.account_id, credit);
          }
        }
      }
    } catch (error) {
      logger.error("Error fetching liabilities for account data", error, {
        itemId,
      });
      // Continue with sync even if liabilities fetch fails
    }

    // Wrap ALL database operations in a transaction for atomicity
    await db.transaction(async (tx) => {
      // 0. Update balances AND create missing accounts (Self-Healing)
      for (const account of accountsData) {
        const liability = liabilitiesMap.get(account.account_id);
        const apr = liability?.aprs?.find(
          (a) => String(a.apr_type) === "purchase_apr",
        )?.apr_percentage;

        await tx.insert(schema.plaidAccounts)
          .values({
            accountId: account.account_id,
            plaidItemId: itemId,
            familyMemberId: item.familyMemberId,
            name: account.name,
            officialName: account.official_name || account.name,
            mask: account.mask || null,
            type: account.type,
            subtype: account.subtype || null,
            currentBalance: account.balances.current || 0,
            availableBalance: account.balances.available || 0,
            limit: account.balances.limit || null,
            isoCurrencyCode: account.balances.iso_currency_code || "USD",
            lastStatementBalance: liability?.last_statement_balance || null,
            lastStatementIssueDate: liability?.last_statement_issue_date
              ? new Date(liability.last_statement_issue_date)
              : null,
            minPaymentAmount: liability?.minimum_payment_amount || null,
            nextPaymentDueDate: liability?.next_payment_due_date
              ? new Date(liability.next_payment_due_date)
              : null,
            lastPaymentAmount: liability?.last_payment_amount || null,
            lastPaymentDate: liability?.last_payment_date
              ? new Date(liability.last_payment_date)
              : null,
            apr: apr || null,
            status: "active",
            updatedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: schema.plaidAccounts.accountId,
            set: {
              currentBalance: account.balances.current || 0,
              availableBalance: account.balances.available || 0,
              limit: account.balances.limit || null,
              name: account.name,
              officialName: account.official_name || account.name,
              mask: account.mask || null,
              type: account.type,
              subtype: account.subtype || null,
              isoCurrencyCode: account.balances.iso_currency_code || "USD",
              lastStatementBalance: liability?.last_statement_balance || null,
              lastStatementIssueDate: liability?.last_statement_issue_date
                ? new Date(liability.last_statement_issue_date)
                : null,
              minPaymentAmount: liability?.minimum_payment_amount || null,
              nextPaymentDueDate: liability?.next_payment_due_date
                ? new Date(liability.next_payment_due_date)
                : null,
              lastPaymentAmount: liability?.last_payment_amount || null,
              lastPaymentDate: liability?.last_payment_date
                ? new Date(liability.last_payment_date)
                : null,
              apr: apr || null,
              updatedAt: new Date(),
            },
          });
      }

      // 1. Handle Added Transactions
      for (const txn of added) {
        await tx.insert(schema.plaidTransactions)
          .values({
            transactionId: txn.transaction_id,
            plaidItemId: itemId,
            accountId: txn.account_id,
            amount: txn.amount, // doublePrecision in schema, number in PlaidTransaction
            date: new Date(txn.date),
            name: txn.name,
            merchantName: txn.merchant_name || null,
            category: txn.category || [],
            pending: txn.pending,
            originalDescription: txn.original_description || null,
            paymentChannel: txn.payment_channel || null,
            transactionCode: txn.transaction_code || null,
            personalFinanceCategoryPrimary: txn.personal_finance_category?.primary || null,
            personalFinanceCategoryDetailed: txn.personal_finance_category?.detailed || null,
          })
          .onConflictDoUpdate({
            target: schema.plaidTransactions.transactionId,
            set: {
              amount: txn.amount,
              date: new Date(txn.date),
              name: txn.name,
              merchantName: txn.merchant_name || null,
              category: txn.category || [],
              pending: txn.pending,
              originalDescription: txn.original_description || null,
              paymentChannel: txn.payment_channel || null,
              transactionCode: txn.transaction_code || null,
              personalFinanceCategoryPrimary: txn.personal_finance_category?.primary || null,
              personalFinanceCategoryDetailed: txn.personal_finance_category?.detailed || null,
              updatedAt: new Date(),
            },
          });
      }

      // 2. Handle Modified Transactions
      for (const txn of modified) {
        await tx.update(schema.plaidTransactions)
          .set({
            amount: txn.amount,
            date: new Date(txn.date),
            name: txn.name,
            merchantName: txn.merchant_name || null,
            category: txn.category || [],
            pending: txn.pending,
            updatedAt: new Date(),
          })
          .where(eq(schema.plaidTransactions.transactionId, txn.transaction_id));
      }

      // 3. Handle Removed Transactions
      for (const txnId of removed) {
        await tx.delete(schema.plaidTransactions)
          .where(eq(schema.plaidTransactions.transactionId, txnId));
      }

      // 5. Update Cursor on PlaidItem
      await tx.update(schema.plaidItems)
        .set({
          nextCursor: nextCursor,
          lastSyncedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(schema.plaidItems.id, itemId));
    });

    // --- MATCH BENEFITS (Async, don't block response) ---
    if (user) {
      void (async () => {
        try {
          await scanAndMatchBenefits(user.id as string);
        } catch (matchError) {
          logger.error("Error in auto-scan benefit matching", matchError, {
            userId: user.id,
          });
        }
      })();
    }

    revalidatePath("/dashboard");
    revalidatePath("/");

    return NextResponse.json({
      added: added.length,
      modified: modified.length,
      removed: removed.length,
      nextCursor,
    });
  } catch (error) {
    logger.error("Error syncing transactions", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
