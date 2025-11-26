import { PrismaClient } from '../generated/prisma/client';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

const prisma = new PrismaClient({});

async function main() {
    const members = await prisma.familyMember.findMany({
        include: { user: true }
    });
    console.log('--- Family Members ---');
    members.forEach(m => {
        console.log(`Name: ${m.name}, Email: ${m.email}, UserID: ${m.userId}, ClerkID: ${m.user.clerkId}`);
    });
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
