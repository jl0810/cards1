import { PrismaClient } from '@prisma/client';
import { fetchInstitutionInfo } from '../lib/plaid-bank';
import "dotenv/config"; // Ensure env vars are loaded

const prisma = new PrismaClient();

async function main() {
    console.log('Starting bank logo backfill...');

    // Fetch all banks
    const banks = await prisma.bank.findMany();
    console.log(`Found ${banks.length} banks to process.`);

    for (const bank of banks) {
        console.log(`Processing bank: ${bank.name} (${bank.plaidId})...`);

        // Skip if we already have a good logo (optional, but you said "backfill all" so maybe we overwrite?)
        // The user asked to "backfill all", implying they want to update them with the NEW logic.
        // So we will re-fetch even if a logo exists.

        try {
            const { logoUrl, brandColor } = await fetchInstitutionInfo(bank.plaidId, bank.name);

            if (logoUrl || brandColor) {
                await prisma.bank.update({
                    where: { id: bank.id },
                    data: {
                        logoUrl: logoUrl || bank.logoUrl, // Prefer new, fallback to old if null
                        brandColor: brandColor || bank.brandColor
                    }
                });
                console.log(`  ✅ Updated ${bank.name}: Logo=${!!logoUrl}, Color=${!!brandColor}`);
            } else {
                console.log(`  ⚠️ No logo found for ${bank.name}`);
            }
        } catch (error) {
            console.error(`  ❌ Failed to process ${bank.name}:`, error);
        }
    }

    console.log('Backfill complete!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
