import { PrismaClient } from '@prisma/client';
import "dotenv/config";

const prisma = new PrismaClient();

async function main() {
    const plaidItems = await prisma.plaidItem.findMany({ include: { bank: true } });
    console.log(`Found ${plaidItems.length} Plaid Items.`);
    
    const banks = await prisma.bank.findMany();
    console.log(`Found ${banks.length} Banks.`);

    // Check how many items are missing banks
    const missingBanks = plaidItems.filter(i => !i.bankId);
    console.log(`${missingBanks.length} Plaid Items are missing a linked Bank.`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
