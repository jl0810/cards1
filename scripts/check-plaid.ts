import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkPlaidItems() {
    try {
        // Get the most recent Plaid item
        const items = await prisma.plaidItem.findMany({
            orderBy: { createdAt: 'desc' },
            take: 5,
            include: {
                accounts: true,
                user: {
                    select: {
                        name: true
                    }
                }
            }
        });

        console.log('\n=== Recent Plaid Items ===\n');

        if (items.length === 0) {
            console.log('No Plaid items found in database.');
            return;
        }

        for (const item of items) {
            console.log(`Item ID: ${item.itemId}`);
            console.log(`Institution: ${item.institutionName || 'Unknown'}`);
            console.log(`Status: ${item.status}`);
            console.log(`User: ${item.user.name || 'Not set'}`);
            console.log(`Access Token ID (Vault): ${item.accessTokenId}`);
            console.log(`Accounts: ${item.accounts.length}`);
            console.log(`Created: ${item.createdAt}`);
            console.log('---');
        }

        // Check if access token is in vault
        const latestItem = items[0];
        console.log('\n=== Checking Vault for Access Token ===\n');

        try {
            const vaultCheck = await prisma.$queryRaw<Array<{ id: string, name: string }>>`
        SELECT id, name FROM vault.secrets WHERE id = ${latestItem.accessTokenId}::uuid
      `;

            if (vaultCheck && vaultCheck.length > 0) {
                console.log('✅ Access token found in Supabase Vault');
                console.log(`   Vault Secret ID: ${vaultCheck[0].id}`);
                console.log(`   Secret Name: ${vaultCheck[0].name}`);
            } else {
                console.log('❌ Access token NOT found in vault');
            }
        } catch (e) {
            console.log('⚠️  Could not query vault (may not have permissions):', e);
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkPlaidItems();
