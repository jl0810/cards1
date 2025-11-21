import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { plaidClient } from '@/lib/plaid';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function POST(req: Request) {
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
        // @ts-ignore - Prisma client update might lag in IDE
        const secretId = item.accessTokenId;
        const vaultResult = await prisma.$queryRaw<{ decrypted_secret: string }[]>`
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

        // Fetch all updates since cursor
        while (hasMore) {
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
        }

        // 1. Handle Added Transactions
        for (const txn of added) {
            // Upsert transaction to avoid duplicates if sync runs multiple times
            await prisma.plaidTransaction.upsert({
                where: { transactionId: txn.transaction_id },
                update: {
                    amount: txn.amount,
                    date: new Date(txn.date),
                    name: txn.name,
                    merchantName: txn.merchant_name,
                    category: txn.category || [],
                    pending: txn.pending,
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
                }
            });
        }

        // 2. Handle Modified Transactions
        for (const txn of modified) {
            await prisma.plaidTransaction.update({
                where: { transactionId: txn.transaction_id },
                data: {
                    amount: txn.amount,
                    date: new Date(txn.date),
                    name: txn.name,
                    merchantName: txn.merchant_name,
                    category: txn.category || [],
                    pending: txn.pending,
                }
            });
        }

        // 3. Handle Removed Transactions
        for (const txn of removed) {
            await prisma.plaidTransaction.delete({
                where: { transactionId: txn.transaction_id },
            }).catch(e => console.log("Transaction already deleted or not found", e));
        }

        // 4. Update Cursor on PlaidItem
        await prisma.plaidItem.update({
            where: { itemId: itemId },
            data: { nextCursor: nextCursor },
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
                        mask: account.mask,
                        type: account.type,
                        subtype: account.subtype,
                    }
                }).catch(e => console.log(`Account ${account.account_id} not found in DB, skipping update`));
            }
        } catch (balanceError) {
            console.error("Error updating balances:", balanceError);
            // Don't fail the whole sync if balance update fails
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
        console.error('Error syncing transactions:', error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}
