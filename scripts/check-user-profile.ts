import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkUserProfile() {
    try {
        const profiles = await prisma.userProfile.findMany({
            include: {
                plaidItems: true
            }
        });

        console.log('\n=== User Profiles ===\n');

        if (profiles.length === 0) {
            console.log('❌ No UserProfile records found in database.');
            console.log('\nThis means the Clerk webhook hasn\'t fired yet or failed.');
            console.log('You need a UserProfile to properly link Plaid items.');
        } else {
            for (const profile of profiles) {
                console.log(`Clerk ID: ${profile.clerkId}`);
                console.log(`Name: ${profile.name || 'Not set'}`);
                console.log(`Plaid Items: ${profile.plaidItems.length}`);
                console.log(`Created: ${profile.createdAt}`);
                console.log('---');
            }
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkUserProfile();
