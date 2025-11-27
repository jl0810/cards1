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
import { auth } from '@clerk/nextjs/server';
import { plaidClient } from '@/lib/plaid';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { PLAID_SYNC_CONFIG } from '@/lib/constants';
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
export async function POST(
    req: Request,
    { params }: { params: Promise<{ itemId: string }> }
) {
    try {
        const { itemId } = await params;
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
        const userProfile = await prisma.userProfile.findUnique({
            where: { clerkId: userId },
        });

        if (!userProfile) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Get PlaidItem and verify ownership
        const item = await prisma.plaidItem.findFirst({
            where: {
                id: itemId,
                userId: userProfile.id,
            },
            include: {
                _count: {
                    select: { transactions: true },
                },
            },
        });

        if (!item) {
            return NextResponse.json({ error: 'Bank account not found' }, { status: 404 });
        }

        const existingTransactionCount = item._count.transactions;

        logger.info('Starting full transaction reload', {
            userId: userProfile.id,
            itemId,
            existingTransactions: existingTransactionCount,
        });

        // Get access token from Vault
        const vaultResult = await prisma.$queryRaw<Array<{ decrypted_secret: string }>>`
            SELECT decrypted_secret FROM vault.decrypted_secrets WHERE id = ${item.accessTokenId}::uuid;
        `;

        const accessToken = vaultResult[0]?.decrypted_secret;

        if (!accessToken) {
            return NextResponse.json(
                { error: 'Failed to retrieve access token' },
                { status: 500 }
            );
        }

        // STEP 1: Delete all existing transactions and reset cursor in a transaction
        await prisma.$transaction(async (tx) => {
            // Delete all transactions (cascades to TransactionExtended and BenefitUsage)
            await tx.plaidTransaction.deleteMany({
                where: { plaidItemId: item.id },
            });

            // Reset cursor and lastSyncedAt
            await tx.plaidItem.update({
                where: { id: item.id },
                data: {
                    nextCursor: null,
                    lastSyncedAt: null,
                },
            });

            logger.info('Deleted existing transactions and reset cursor', {
                itemId,
                deletedCount: existingTransactionCount,
            });
        });

        // STEP 2: Fetch ALL transactions from Plaid (cursor = null means start from beginning)
        let hasMore = true;
        let nextCursor: string | null = null;
        let allTransactions: any[] = [];
        let iterations = 0;

        while (hasMore && iterations < PLAID_SYNC_CONFIG.MAX_ITERATIONS) {
            try {
                const response = await plaidClient.transactionsSync({
                    access_token: accessToken,
                    cursor: nextCursor || undefined,
                });

                const data = response.data;
                allTransactions = allTransactions.concat(data.added);
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
        await prisma.$transaction(async (tx) => {
            // Get all accounts for this item
            const accounts = await tx.plaidAccount.findMany({
                where: { plaidItemId: item.id },
                select: { accountId: true },
            });

            const accountIds = new Set(accounts.map((a) => a.accountId));

            // Filter transactions that belong to this item's accounts
            const relevantTransactions = allTransactions.filter((t) =>
                accountIds.has(t.account_id)
            );

            // Insert transactions
            for (const transaction of relevantTransactions) {
                await tx.plaidTransaction.create({
                    data: {
                        plaidItemId: item.id,
                        transactionId: transaction.transaction_id,
                        accountId: transaction.account_id,
                        amount: transaction.amount,
                        date: new Date(transaction.date),
                        name: transaction.name,
                        merchantName: transaction.merchant_name,
                        category: transaction.category || [],
                        pending: transaction.pending,
                        originalDescription: transaction.original_description,
                        paymentChannel: transaction.payment_channel,
                        transactionCode: transaction.transaction_code,
                        personalFinanceCategoryPrimary:
                            transaction.personal_finance_category?.primary,
                        personalFinanceCategoryDetailed:
                            transaction.personal_finance_category?.detailed,
                    },
                });
            }

            // Update cursor
            await tx.plaidItem.update({
                where: { id: item.id },
                data: {
                    nextCursor: nextCursor,
                    lastSyncedAt: new Date(),
                },
            });

            logger.info('Inserted all transactions', {
                itemId,
                count: relevantTransactions.length,
            });
        });

        // STEP 4: Re-run benefit matching
        try {
            await scanAndMatchBenefits(userId);
            logger.info('Re-ran benefit matching after reload', { userId, itemId });
        } catch (matchError) {
            logger.error('Error in benefit matching after reload', matchError, {
                userId,
                itemId,
            });
            // Don't fail the reload if benefit matching fails
        }

        // Count relevant transactions (already filtered during insert)
        const accounts = await prisma.plaidAccount.findMany({
            where: { plaidItemId: item.id },
            select: { accountId: true },
        });
        const accountIds = new Set(accounts.map((a) => a.accountId));
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
