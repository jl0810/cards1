import { PrismaClient } from '../generated/prisma/client';
import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

const prisma = new PrismaClient({});

const configuration = new Configuration({
    basePath: PlaidEnvironments[process.env.PLAID_ENV || 'sandbox'],
    baseOptions: {
        headers: {
            'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID,
            'PLAID-SECRET': process.env.PLAID_SECRET,
        },
    },
});

const plaidClient = new PlaidApi(configuration);

async function syncItem(item: any) {
    console.log(`Syncing item: ${item.institutionName} (${item.id})...`);

    try {
        // Retrieve Access Token from Vault
        const secretId = item.accessTokenId;
        const vaultResult = await prisma.$queryRaw<{ decrypted_secret: string }[]>`
            SELECT decrypted_secret FROM vault.decrypted_secrets WHERE id = ${secretId}::uuid;
        `;
        const accessToken = vaultResult[0]?.decrypted_secret;

        if (!accessToken) {
            console.error(`  Failed to retrieve access token for item ${item.id}`);
            return;
        }

        // Sync Transactions
        let hasMore = true;
        let nextCursor = item.nextCursor;
        let addedCount = 0;

        while (hasMore) {
            const response = await plaidClient.transactionsSync({
                access_token: accessToken,
                cursor: nextCursor || undefined,
            });

            const data = response.data;

            // Process Added
            for (const txn of data.added) {
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
                        plaidItem: { connect: { id: item.id } }, // Use DB ID here
                        account: { connect: { accountId: txn.account_id } },
                        amount: txn.amount,
                        date: new Date(txn.date),
                        name: txn.name,
                        merchantName: txn.merchant_name,
                        category: txn.category || [],
                        pending: txn.pending,
                    }
                }).catch(e => {
                    // Ignore if account not found (might be filtered out)
                    // console.log(`    Skipping txn ${txn.transaction_id} (Account not found?)`);
                });
            }
            addedCount += data.added.length;
            hasMore = data.has_more;
            nextCursor = data.next_cursor;
        }

        // Update Cursor
        await prisma.plaidItem.update({
            where: { id: item.id },
            data: { nextCursor: nextCursor, lastSyncedAt: new Date() },
        });

        console.log(`  Synced ${addedCount} new transactions.`);

    } catch (error: any) {
        console.error(`  Error syncing item ${item.id}:`, error.response?.data || error.message);
    }
}

async function main() {
    const items = await prisma.plaidItem.findMany();
    console.log(`Found ${items.length} items to sync.`);

    for (const item of items) {
        await syncItem(item);
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
