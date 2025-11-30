/**
 * Plaid Transaction Sync API
 * Syncs transactions from Plaid and matches to credit card benefits
 * 
 * @module app/api/plaid/sync-transactions
 */

import { NextResponse, NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { plaidClient } from '@/lib/plaid';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { scanAndMatchBenefits } from '@/lib/benefit-matcher';
import { logger } from '@/lib/logger';
import { PLAID_SYNC_CONFIG } from '@/lib/constants';
import { validateBody } from '@/lib/validation-middleware';
import { z } from 'zod';

/**
 * Plaid Transaction Sync schemas
 */
export const SyncTransactionsSchema = z.object({
  itemId: z.string().uuid('Invalid item ID'),
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
                error: 'Too many sync requests',
                message: 'Please wait before syncing again. Limit: 10 syncs per hour.'
            }),
            {
                status: 429,
                headers: {
                    'Content-Type': 'application/json',
                    'Retry-After': '3600'
                }
            }
        );
    }

    try {
        const { userId } = await auth();

        if (!userId) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        // Validate request body
        const bodyValidation = await validateBody(SyncTransactionsSchema, req);
        if (!bodyValidation.success) {
            return bodyValidation.error;
        }

        const { itemId, cursor } = bodyValidation.data;

        // 1. Get PlaidItem to find the secret ID
        const item = await prisma.plaidItem.findUnique({
            where: { itemId: itemId },
        });

        if (!item) {
            return new NextResponse("Item not found", { status: 404 });
        }

        // 2. Retrieve Access Token from Vault
        // We use a raw query to select from the vault.decrypted_secrets view
        const secretId = item.accessTokenId;
        const vaultResult = await prisma.$queryRaw<Array<{ decrypted_secret: string }>>`
      SELECT decrypted_secret FROM vault.decrypted_secrets WHERE id = ${secretId}::uuid;
    `;

        const accessToken = vaultResult[0]?.decrypted_secret;

        if (!accessToken) {
            return new NextResponse("Failed to retrieve access token", { status: 500 });
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
                added = added.concat(data.added);
                modified = modified.concat(data.modified);
                removed = removed.concat(data.removed.map(r => r.transaction_id));
                hasMore = data.has_more;
                nextCursor = data.next_cursor;
                iterations++;
            } catch (syncError) {
                logger.error('Error on sync iteration', syncError, { iteration: iterations, itemId });
                // Stop syncing but don't fail completely - partial sync is better than nothing
                hasMore = false;
            }
        }

        if (iterations >= PLAID_SYNC_CONFIG.MAX_ITERATIONS) {
            logger.warn('Transaction sync hit maximum iterations', {
                maxIterations: PLAID_SYNC_CONFIG.MAX_ITERATIONS,
                itemId
            });
        }

        // BUG FIX #4: Fetch balances BEFORE transaction to include in atomic operation
        let balanceData: PlaidBalance[] = [];
        try {
            const balanceResponse = await plaidClient.accountsBalanceGet({
                access_token: accessToken,
            });
            balanceData = balanceResponse.data.accounts.map(account => ({
                account_id: account.account_id,
                balance: {
                    current: account.balances?.current || 0,
                    available: account.balances?.available || 0,
                    limit: account.balances?.limit || undefined,
                },
            }));
        } catch (balanceError) {
            logger.error('Error fetching balances', balanceError, { itemId });
            // Continue with sync even if balance fetch fails
        }

        // Wrap ALL database operations in a transaction for atomicity
        await prisma.$transaction(async (tx) => {
            // 1. Handle Added Transactions
            for (const txn of added) {
                // Upsert transaction to avoid duplicates if sync runs multiple times
                await tx.plaidTransaction.upsert({
                    where: { transactionId: txn.transaction_id },
                    update: {
                        amount: txn.amount,
                        date: new Date(txn.date),
                        name: txn.name,
                        merchantName: txn.merchant_name,
                        category: txn.category || [],
                        pending: txn.pending,
                        originalDescription: txn.original_description,
                        paymentChannel: txn.payment_channel,
                        transactionCode: txn.transaction_code,
                        personalFinanceCategoryPrimary: txn.personal_finance_category?.primary,
                        personalFinanceCategoryDetailed: txn.personal_finance_category?.detailed,
                    },
                    create: {
                        transactionId: txn.transaction_id,
                        plaidItem: { connect: { itemId: itemId } },
                        account: { connect: { accountId: txn.account_id } },
                        amount: txn.amount,
                        date: new Date(txn.date),
                        name: txn.name,
                        merchantName: txn.merchant_name,
                        category: txn.category || [],
                        pending: txn.pending,
                        originalDescription: txn.original_description,
                        paymentChannel: txn.payment_channel,
                        transactionCode: txn.transaction_code,
                        personalFinanceCategoryPrimary: txn.personal_finance_category?.primary,
                        personalFinanceCategoryDetailed: txn.personal_finance_category?.detailed,
                    }
                });
            }

            // 2. Handle Modified Transactions
            for (const txn of modified) {
                await tx.plaidTransaction.update({
                    where: { transactionId: txn.transaction_id },
                    data: {
                        amount: txn.amount,
                        date: new Date(txn.date),
                        name: txn.name,
                        merchantName: txn.merchant_name,
                        category: txn.category || [],
                        pending: txn.pending,
                    }
                }).catch(e => {
                    // BUG FIX: Log as ERROR not debug - this is a data integrity issue
                    logger.error('Transaction not found for update - data integrity issue', e, {
                        transactionId: txn.transaction_id,
                        itemId
                    });
                });
            }

            // 3. Handle Removed Transactions
            for (const txn of removed) {
                await tx.plaidTransaction.delete({
                    where: { transactionId: txn },
                }).catch(_e => {
                    // BUG FIX: Log as WARNING not debug - transaction may have been manually deleted
                    logger.warn('Transaction not found for deletion', {
                        transactionId: txn,
                        itemId
                    });
                });
            }

            // 4. BUG FIX #4: Update balances INSIDE transaction for atomicity
            for (const account of balanceData) {
                await tx.plaidAccount.update({
                    where: { accountId: account.account_id },
                    data: {
                        currentBalance: account.balance.current,
                        availableBalance: account.balance.available,
                        limit: account.balance.limit,
                    },
                }).catch(_e => {
                    // Account might not exist, that's okay
                    logger.debug('Account not found for balance update', {
                        accountId: account.account_id,
                    });
                });
            }

            // 5. Update Cursor on PlaidItem
            await tx.plaidItem.update({
                where: { itemId: itemId },
                data: {
                    nextCursor: nextCursor,
                    lastSyncedAt: new Date()
                },
            });
        }, {
            timeout: PLAID_SYNC_CONFIG.DB_TIMEOUT_MS // Increase timeout for large batches
        });

        // --- MATCH BENEFITS (Async, don't block response) ---
        // Automatically scan and match benefits for the user (handles both new and old transactions)
        if (userId) {
            (async () => {
                try {
                    // We can scope this to the specific item's accounts if we want, 
                    // but scanning all user accounts is safer to ensure nothing is missed.
                    // Since we have cursor tracking, it's efficient.
                    await scanAndMatchBenefits(userId);
                } catch (matchError) {
                    logger.error('Error in auto-scan benefit matching', matchError, { userId });
                }
            })();
        }

        revalidatePath('/dashboard');
        revalidatePath('/');

        return NextResponse.json({
            added: added.length,
            modified: modified.length,
            removed: removed.length,
            nextCursor
        });

    } catch (error) {
        logger.error('Error syncing transactions', error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}
