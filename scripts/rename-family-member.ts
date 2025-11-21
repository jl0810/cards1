import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    // Find the family member named "Partner" for your user
    // We'll search by name to be safe
    const member = await prisma.familyMember.findFirst({
        where: {
            name: 'Partner'
        }
    });

    if (!member) {
        console.log('No member named "Partner" found.');
        return;
    }

    console.log(`Renaming member ${member.id} from "${member.name}" to "Family Member"...`);

    const updated = await prisma.familyMember.update({
        where: { id: member.id },
        data: {
            name: 'Family Member'
        }
    });

    console.log(`Renamed to: ${updated.name}`);
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
