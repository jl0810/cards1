import { PrismaClient } from '@prisma/client';
import "dotenv/config";

const prisma = new PrismaClient();

async function main() {
    const barclays = await prisma.bank.findMany({
        where: {
            name: { contains: 'Barclays', mode: 'insensitive' }
        }
    });

    console.log('Barclays entries:', JSON.stringify(barclays, null, 2));
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
