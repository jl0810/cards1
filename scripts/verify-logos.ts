import { PrismaClient } from '@prisma/client';
import "dotenv/config";

const prisma = new PrismaClient();

async function main() {
    const banks = await prisma.bank.findMany();
    console.log(`Checked ${banks.length} banks.`);
    
    const withLogo = banks.filter(b => b.logoUrl);
    console.log(`${withLogo.length} have logos.`);
    
    if (withLogo.length < banks.length) {
        console.log('Some banks are missing logos. Printing details:');
        banks.filter(b => !b.logoUrl).forEach(b => console.log(`- ${b.name} (${b.plaidId})`));
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
