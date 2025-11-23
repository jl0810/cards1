// Load environment variables FIRST before any other imports
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { prisma } from '@/lib/prisma';
import { fetchInstitutionInfo } from '@/lib/plaid-bank';

async function main() {
    console.log('Refreshing all bank branding...');
    console.log('Plaid Client ID:', process.env.PLAID_CLIENT_ID ? 'Set' : 'Missing');
    console.log('Plaid Secret:', process.env.PLAID_SECRET ? 'Set' : 'Missing');

    const banks = await prisma.bank.findMany();
    console.log(`Found ${banks.length} banks`);

    for (const bank of banks) {
        console.log(`\nProcessing: ${bank.name} (${bank.plaidId})`);

        try {
            const info = await fetchInstitutionInfo(bank.plaidId, bank.name);

            if (info.logoUrl || info.brandColor) {
                await prisma.bank.update({
                    where: { id: bank.id },
                    data: {
                        logoUrl: info.logoUrl || bank.logoUrl,
                        brandColor: info.brandColor || bank.brandColor,
                    },
                });
                console.log(`✓ Updated: Logo=${!!info.logoUrl}, Color=${info.brandColor}`);
            } else {
                console.log(`✗ No branding found`);
            }
        } catch (e: any) {
            console.error(`✗ Failed: ${e.message}`);
        }
    }

    console.log('\nDone!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
