
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkUser() {
    const email = 'jefflawson@gmail.com';
    console.log(`🔍 Checking database for user: ${email}`);
    console.log(`   DB URL: ${process.env.DATABASE_URL?.split('@')[1]}`); // Log host only for safety

    // Hardcoded check for the user we found
    const targetUserId = 'cmi2d7gv50000o4qu23it1doz';
    console.log(`\n🔍 Checking data for UserProfile ID: ${targetUserId}`);

    const counts = await prisma.$transaction([
        prisma.plaidItem.count({ where: { userId: targetUserId } }),
        prisma.plaidAccount.count({ where: { plaidItem: { userId: targetUserId } } }),
        prisma.plaidTransaction.count({ where: { plaidItem: { userId: targetUserId } } }),
        prisma.cardProduct.count({ where: { active: true } })
    ]);

    console.log('\n📊 Data Counts:');
    console.log(`   Plaid Items: ${counts[0]}`);
    console.log(`   Accounts:    ${counts[1]}`);
    console.log(`   Transactions:${counts[2]}`);
    console.log(`   Card Catalog:${counts[3]}`);

    if (counts[0] === 0) {
        console.log('\n⚠️  No Plaid Items found. Did you link banks in this environment?');
    }
}

checkUser()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
