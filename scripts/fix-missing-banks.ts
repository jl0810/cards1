import { PrismaClient } from '@prisma/client';
import { ensureBankExists } from '../lib/plaid-bank';
import "dotenv/config";

const prisma = new PrismaClient();

async function main() {
    console.log('Starting bank restoration...');

    // Fetch items without banks
    const items = await prisma.plaidItem.findMany({
        where: { bankId: null }
    });

    console.log(`Found ${items.length} Plaid Items missing bank links.`);

    for (const item of items) {
        console.log(`Processing item: ${item.institutionName} (${item.institutionId})...`);
        try {
            // ensureBankExists handles fetching info, creating Bank, and updating PlaidItem
            // It will also use the new logo.dev logic we added
            const bankId = await ensureBankExists({
                id: item.id,
                institutionId: item.institutionId,
                institutionName: item.institutionName
            });
            console.log(`  ✅ Linked to Bank ID: ${bankId}`);
        } catch (error) {
            console.error(`  ❌ Failed to process item ${item.id}:`, error);
        }
    }

    console.log('Bank restoration complete!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
