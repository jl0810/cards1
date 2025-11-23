import { PrismaClient } from '@prisma/client';
import "dotenv/config";

const prisma = new PrismaClient();

async function main() {
    // Use logo.dev with token if available, or fallback to clearbit
    const token = process.env.LOGO_DEV_TOKEN;
    const domain = 'barclaysus.com';
    const logoUrl = token 
        ? `https://img.logo.dev/${domain}?token=${token}&size=128&format=png`
        : `https://logo.clearbit.com/${domain}`;

    const update = await prisma.bank.updateMany({
        where: {
            name: { contains: 'Barclays', mode: 'insensitive' }
        },
        data: {
            logoUrl: logoUrl,
            brandColor: '#00aeef' // Official Barclays Blue
        }
    });

    console.log(`Updated ${update.count} Barclays entries with logo: ${logoUrl}`);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
