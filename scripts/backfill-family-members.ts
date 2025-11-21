// @ts-nocheck
import pkg from '@prisma/client';

const { PrismaClient } = pkg;
const prisma = new PrismaClient();

async function ensurePrimaryFamilyMember(userProfile: { id: string; name?: string | null; avatar?: string | null }) {
  let member = await prisma.familyMember.findFirst({
    where: {
      userId: userProfile.id,
      isPrimary: true,
    },
  });

  const desiredName = userProfile.name || 'Primary Member';
  const updates: Record<string, string | null> = {};

  if (member) {
    if (member.name !== desiredName) {
      updates.name = desiredName;
    }
    if (userProfile.avatar && member.avatar !== userProfile.avatar) {
      updates.avatar = userProfile.avatar;
    }

    if (Object.keys(updates).length > 0) {
      member = await prisma.familyMember.update({
        where: { id: member.id },
        data: updates,
      });
    }

    return member;
  }

  return prisma.familyMember.create({
    data: {
      userId: userProfile.id,
      name: desiredName,
      avatar: userProfile.avatar,
      role: 'Owner',
      isPrimary: true,
    },
  });
}

async function main() {
  const items = await prisma.plaidItem.findMany({
    where: { familyMemberId: null },
    include: { user: true },
  });

  for (const item of items) {
    const member = await ensurePrimaryFamilyMember({
      id: item.user.id,
      name: item.user.name,
      avatar: item.user.avatar,
    });

    await prisma.plaidItem.update({
      where: { id: item.id },
      data: { familyMemberId: member.id },
    });

    await prisma.plaidAccount.updateMany({
      where: { plaidItemId: item.id },
      data: { familyMemberId: member.id },
    });
  }

  const orphanAccounts = await prisma.plaidAccount.findMany({
    where: { familyMemberId: null },
    include: {
      plaidItem: {
        include: {
          user: true,
          familyMember: true,
        },
      },
    },
  });

  for (const account of orphanAccounts) {
    let memberId = account.plaidItem?.familyMemberId;

    if (!memberId && account.plaidItem?.user) {
      const member = await ensurePrimaryFamilyMember({
        id: account.plaidItem.user.id,
        name: account.plaidItem.user.name,
        avatar: account.plaidItem.user.avatar,
      });
      memberId = member.id;
    }

    if (memberId) {
      await prisma.plaidAccount.update({
        where: { id: account.id },
        data: { familyMemberId: memberId },
      });
    }
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log('Backfill complete');
  })
  .catch(async (err) => {
    console.error('Backfill failed', err);
    await prisma.$disconnect();
    process.exit(1);
  });
