import { PrismaClient } from '../generated/prisma/client';

const prisma = new PrismaClient({});

async function main() {
    // The Clerk ID from the previous log
    const clerkId = 'user_35OjAzCb1MEWc5KrvjCnLFYAUb0';

    const user = await prisma.userProfile.findUnique({
        where: { clerkId },
    });

    if (!user) {
        console.error('User not found!');
        return;
    }

    console.log(`Adding family member for user ${user.id}...`);

    const newMember = await prisma.familyMember.create({
        data: {
            userId: user.id,
            name: 'Partner',
            role: 'Member',
            isPrimary: false,
            // Optional: Add an avatar if you want to test that
            // avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Partner' 
        }
    });

    console.log(`Created family member: ${newMember.name} (${newMember.id})`);
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
