import { PrismaClient } from '@prisma/client';
import path from 'path';
import dotenv from 'dotenv';

// Load env from root
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const prisma = new PrismaClient();

async function main() {
    const token = process.env.LOGO_DEV_TOKEN;
    if (!token) {
        throw new Error("LOGO_DEV_TOKEN is missing from environment variables.");
    }

    const domain = 'barclaysus.com';
    const logoUrl = `https://img.logo.dev/${domain}?token=${token}&size=128&format=png`;

    console.log(`Updating Barclays with Logo.dev URL: ${logoUrl}`);

    const update = await prisma.bank.updateMany({
        where: {
            name: { contains: 'Barclays', mode: 'insensitive' }
        },
        data: {
            logoUrl: logoUrl,
            brandColor: '#00aeef'
        }
    });

    console.log(`Updated ${update.count} Barclays entries.`);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
