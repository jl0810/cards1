import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Starting fix script...');

    // 1. Get all UserProfiles
    const users = await prisma.userProfile.findMany({
        include: {
            familyMembers: {
                where: { isPrimary: true }
            }
        }
    });

    console.log(`Found ${users.length} users.`);

    for (const user of users) {
        let primaryMember = user.familyMembers[0];

        if (!primaryMember) {
            console.log(`User ${user.id} has no primary family member. Creating one...`);
            primaryMember = await prisma.familyMember.create({
                data: {
                    userId: user.id,
                    name: user.name || 'Primary Member',
                    isPrimary: true,
                    role: 'Owner'
                }
            });
        }

        console.log(`Fixing items for user ${user.id} using family member ${primaryMember.id}...`);

        try {
            // Fix Plaid Items
            // We use raw SQL to bypass Prisma's schema validation which crashes on NULLs
            const itemsUpdated = await prisma.$executeRaw`
            UPDATE "plaid_items"
            SET "familyMemberId" = ${primaryMember.id}
            WHERE "userId" = ${user.id} AND "familyMemberId" IS NULL;
        `;
            console.log(`Updated ${itemsUpdated} Plaid Items.`);

            // Fix Plaid Accounts
            const accountsUpdated = await prisma.$executeRaw`
            UPDATE "plaid_accounts"
            SET "familyMemberId" = ${primaryMember.id}
            WHERE "familyMemberId" IS NULL 
            AND "plaidItemId" IN (SELECT "id" FROM "plaid_items" WHERE "userId" = ${user.id});
        `;
            console.log(`Updated ${accountsUpdated} Plaid Accounts.`);

        } catch (e) {
            console.error(`Error updating user ${user.id}:`, e);
        }
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
