import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function checkData() {
  try {
    // Get user profile
    const users = await prisma.userProfile.findMany({
      select: {
        id: true,
        name: true,
        clerkId: true,
      },
    });

    console.log(`\n📊 Found ${users.length} users:`);
    for (const user of users) {
      console.log(`  - ${user.name} (${user.id})`);

      // Get Plaid items for this user
      const items = await prisma.plaidItem.findMany({
        where: { userId: user.id },
        select: {
          id: true,
          institutionName: true,
          _count: {
            select: {
              accounts: true,
            },
          },
        },
      });

      console.log(`    Plaid Items: ${items.length}`);
      for (const item of items) {
        console.log(
          `      - ${item.institutionName}: ${item._count.accounts} accounts`,
        );
      }

      // Get total accounts
      const totalAccounts = await prisma.plaidAccount.count({
        where: {
          plaidItem: {
            userId: user.id,
          },
        },
      });

      console.log(`    Total Accounts: ${totalAccounts}\n`);
    }

    // Check if there are orphaned accounts
    const orphanedAccounts = await prisma.plaidAccount.findMany({
      where: {
        plaidItem: null,
      },
      select: {
        id: true,
        name: true,
        officialName: true,
      },
    });

    if (orphanedAccounts.length > 0) {
      console.log(
        `⚠️  Found ${orphanedAccounts.length} orphaned accounts (no plaidItem):`,
      );
      orphanedAccounts.forEach((acc) => {
        console.log(`  - ${acc.officialName || acc.name} (${acc.id})`);
      });
    }
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkData();
