/**
 * Plaid Transaction Sync API
 * Syncs transactions from Plaid and matches to credit card benefits
 * 
 * @module app/api/plaid/sync-transactions
 */

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { plaidClient } from '@/lib/plaid';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { matchTransactionToBenefits, linkTransactionToBenefit, scanAndMatchBenefits } from '@/lib/benefit-matcher';
import { logger } from '@/lib/logger';
import { PLAID_SYNC_CONFIG } from '@/lib/constants';

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
export async function POST(req: Request) {
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

        const body = await req.json();
        const { itemId, cursor } = body; // Expect itemId now

        if (!itemId) {
            return new NextResponse("Missing item ID", { status: 400 });
        }

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
        let added: any[] = [];
        let modified: any[] = [];
        let removed: any[] = [];
        let iterations = 0;

        // Fetch all updates since cursor (with safety limits)
        while (hasMore && iterations < PLAID_SYNC_CONFIG.MAX_ITERATIONS) {
            try {
                const response = await plaidClient.transactionsSync({
                    access_token: accessToken,
                    cursor: nextCursor,
                });

                const data = response.data;
                added = added.concat(data.added);
                modified = modified.concat(data.modified);
                removed = removed.concat(data.removed);
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

        // Wrap all database operations in a transaction for atomicity
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
                }).catch(e => logger.debug('Transaction not found for update, skipping', { transactionId: txn.transaction_id, error: e }));
            }

            // 3. Handle Removed Transactions
            for (const txn of removed) {
                await tx.plaidTransaction.delete({
                    where: { transactionId: txn.transaction_id },
                }).catch(e => logger.debug('Transaction already deleted or not found', { transactionId: txn.transaction_id }));
            }

            // 4. Update Cursor on PlaidItem
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

        // --- UPDATE ACCOUNT BALANCES ---
        try {
            const balanceResponse = await plaidClient.accountsBalanceGet({
                access_token: accessToken,
            });

            for (const account of balanceResponse.data.accounts) {
                await prisma.plaidAccount.update({
                    where: { accountId: account.account_id },
                    data: {
                        currentBalance: account.balances.current,
                        availableBalance: account.balances.available,
                        limit: account.balances.limit,
                        name: account.name,
                        officialName: account.official_name,
                        mask: account.mask,
                        type: account.type,
                        subtype: account.subtype,
                    }
                }).catch(e => logger.debug('Account not found in DB, skipping update', { accountId: account.account_id }));
            }
        } catch (balanceError) {
            logger.error('Error updating balances', balanceError, { itemId });
            // Don't fail the whole sync if balance update fails
        }

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
