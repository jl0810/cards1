import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const users = await prisma.userProfile.findMany({
        include: {
            familyMembers: true
        }
    });

    console.log(`Found ${users.length} users.`);

    for (const user of users) {
        console.log(`User: ${user.name} (${user.clerkId})`);
        console.log(`Family Members (${user.familyMembers.length}):`);
        user.familyMembers.forEach(m => {
            console.log(` - ${m.name} (ID: ${m.id}, Primary: ${m.isPrimary})`);
        });
        console.log('---');
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
