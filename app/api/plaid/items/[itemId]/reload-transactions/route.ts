/**
 * Plaid Transaction Full Reload API (Dump & Reload)
 * Deletes all existing transactions and reloads complete history from Plaid
 * 
 * @module app/api/plaid/items/[itemId]/reload-transactions
 * @implements BR-036 - Full Transaction Reload & Data Loss Warning
 * @implements BR-013 - Atomic Transaction Processing
 * @satisfies US-022 - Full Transaction Reload
 */

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, schema, eq, and, sql, count } from '@/db';
import { PLAID_SYNC_CONFIG } from '@/lib/constants';
import { logger } from '@/lib/logger';
import { Errors } from '@/lib/api-errors';
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit';

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

import { scanAndMatchBenefits } from '@/lib/benefit-matcher';

export const dynamic = 'force-dynamic';

/**
 * Full transaction reload - deletes all transactions and reloads from scratch
 * 
 * CRITICAL: This is a destructive operation that:
 * - Deletes ALL transactions for the bank account
 * - Deletes ALL benefit usage tracking
 * - Resets the Plaid cursor to null
 * - Fetches complete transaction history from Plaid
 * 
 * @route POST /api/plaid/items/[itemId]/reload-transactions
 * @param {Request} req - Contains confirmation: "RELOAD"
 * @param {Object} params - Route parameters
 * @param {string} params.itemId - ID of PlaidItem to reload
 * @returns {Promise<NextResponse>} Reload statistics
 */
import { plaidClient } from '@/lib/plaid';

export async function POST(
    req: Request,
    { params }: { params: Promise<{ itemId: string }> }
) {
    // Rate limit: 5 per minute (destructive operation)
    const limited = await rateLimit(req, RATE_LIMITS.sensitive);
    if (limited) {
        return new Response('Too many requests', { status: 429 });
    }

    try {
        const { itemId } = await params;
        const session = await auth();
        const user = session?.user;

        if (!user?.id) {
            return Errors.unauthorized();
        }

        // Verify confirmation
        const body = await req.json();
        if (body.confirmation !== 'RELOAD') {
            return NextResponse.json(
                { error: 'Confirmation required. Must send { confirmation: "RELOAD" }' },
                { status: 400 }
            );
        }

        // Get user profile
        const userProfile = await db.query.userProfiles.findFirst({
            where: eq(schema.userProfiles.supabaseId, user.id),
        });

        if (!userProfile) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Get PlaidItem and verify ownership
        const item = await db.query.plaidItems.findFirst({
            where: and(
                eq(schema.plaidItems.id, itemId),
                eq(schema.plaidItems.userId, userProfile.id),
            ),
        });

        if (!item) {
            return NextResponse.json({ error: 'Bank account not found' }, { status: 404 });
        }

        // Get transaction count separately
        const [countResult] = await db.select({ count: count() })
            .from(schema.plaidTransactions)
            .where(eq(schema.plaidTransactions.plaidItemId, item.id));

        const existingTransactionCount = Number(countResult.count);

        logger.info('Starting full transaction reload', {
            userId: userProfile.id,
            itemId,
            existingTransactions: existingTransactionCount,
        });

        // Get access token from Vault
        const vaultResult = await db.execute(sql`
            SELECT decrypted_secret FROM vault.decrypted_secrets WHERE id = ${item.accessTokenId}::uuid;
        `);

        const accessToken = (vaultResult as any)[0]?.decrypted_secret;

        if (!accessToken) {
            return NextResponse.json(
                { error: 'Failed to retrieve access token' },
                { status: 500 }
            );
        }

        // STEP 1: Delete all existing transactions and reset cursor in a transaction
        await db.transaction(async (tx) => {
            // Delete all transactions (cascades to TransactionExtended and BenefitUsage)
            await tx.delete(schema.plaidTransactions)
                .where(eq(schema.plaidTransactions.plaidItemId, item.id));

            // Reset cursor and lastSyncedAt
            await tx.update(schema.plaidItems)
                .set({
                    nextCursor: null,
                    lastSyncedAt: null,
                    updatedAt: new Date(),
                })
                .where(eq(schema.plaidItems.id, item.id));

            logger.info('Deleted existing transactions and reset cursor', {
                itemId,
                deletedCount: existingTransactionCount,
            });
        });

        // STEP 2: Fetch ALL transactions from Plaid (cursor = null means start from beginning)
        let hasMore = true;
        let nextCursor: string | null = null;
        let allTransactions: PlaidTransaction[] = [];
        let iterations = 0;

        while (hasMore && iterations < PLAID_SYNC_CONFIG.MAX_ITERATIONS) {
            try {
                const response = await plaidClient.transactionsSync({
                    access_token: accessToken,
                    cursor: nextCursor || undefined,
                });

                const data = response.data;
                allTransactions = allTransactions.concat(data.added as any);
                hasMore = data.has_more;
                nextCursor = data.next_cursor;
                iterations++;

                logger.info('Fetched transaction batch', {
                    itemId,
                    iteration: iterations,
                    batchSize: data.added.length,
                    totalSoFar: allTransactions.length,
                    hasMore,
                });
            } catch (syncError) {
                logger.error('Error fetching transactions from Plaid', syncError, {
                    iteration: iterations,
                    itemId,
                });
                throw new Error('Failed to fetch transactions from Plaid');
            }
        }

        // STEP 3: Insert all transactions in a single database transaction
        await db.transaction(async (tx) => {
            // Get all accounts for this item
            const accounts = await tx.query.plaidAccounts.findMany({
                where: eq(schema.plaidAccounts.plaidItemId, item.id),
                columns: { accountId: true },
            });

            const accountIds = new Set(accounts.map((a: any) => a.accountId));

            // Filter transactions that belong to this item's accounts
            const relevantTransactions = allTransactions.filter((t) =>
                accountIds.has(t.account_id)
            );

            // Insert transactions
            for (const transaction of relevantTransactions) {
                await tx.insert(schema.plaidTransactions).values({
                    plaidItemId: item.id,
                    transactionId: transaction.transaction_id,
                    accountId: transaction.account_id,
                    amount: transaction.amount,
                    date: new Date(transaction.date),
                    name: transaction.name,
                    merchantName: transaction.merchant_name || null,
                    category: transaction.category || [],
                    pending: transaction.pending,
                    originalDescription: transaction.original_description || null,
                    paymentChannel: transaction.payment_channel || null,
                    transactionCode: transaction.transaction_code || null,
                    personalFinanceCategoryPrimary:
                        transaction.personal_finance_category?.primary || null,
                    personalFinanceCategoryDetailed:
                        transaction.personal_finance_category?.detailed || null,
                });
            }

            // Update cursor
            await tx.update(schema.plaidItems)
                .set({
                    nextCursor: nextCursor,
                    lastSyncedAt: new Date(),
                    updatedAt: new Date(),
                })
                .where(eq(schema.plaidItems.id, item.id));

            logger.info('Inserted all transactions', {
                itemId,
                count: relevantTransactions.length,
            });
        });

        // STEP 4: Re-run benefit matching
        try {
            await scanAndMatchBenefits(user.id);
            logger.info('Re-ran benefit matching after reload', { userId: user.id, itemId });
        } catch (matchError) {
            logger.error('Error in benefit matching after reload', matchError, {
                userId: user.id,
                itemId,
            });
            // Don't fail the reload if benefit matching fails
        }

        // Count relevant transactions
        const accounts = await db.query.plaidAccounts.findMany({
            where: eq(schema.plaidAccounts.plaidItemId, item.id),
            columns: { accountId: true },
        });
        const accountIds = new Set(accounts.map((a: any) => a.accountId));
        const newTransactionCount = allTransactions.filter((t) =>
            accountIds.has(t.account_id)
        ).length;

        logger.info('Transaction reload completed successfully', {
            userId: userProfile.id,
            itemId,
            deletedCount: existingTransactionCount,
            reloadedCount: newTransactionCount,
        });

        return NextResponse.json({
            success: true,
            deletedCount: existingTransactionCount,
            reloadedCount: newTransactionCount,
            message: `Successfully reloaded ${newTransactionCount} transactions`,
        });
    } catch (error) {
        logger.error('Error in transaction reload', error);
        return NextResponse.json(
            { error: 'Failed to reload transactions' },
            { status: 500 }
        );
    }
}
