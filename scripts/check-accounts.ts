import { prisma } from "../lib/prisma";

async function checkAccounts() {
  try {
    console.log("\n📊 Checking PlaidItems and PlaidAccounts...\n");

    const items = await prisma.plaidItem.findMany({
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

    console.log(`Found ${items.length} PlaidItems:`);
    items.forEach((item) => {
      console.log(
        `  - ${item.institutionName}: ${item._count.accounts} accounts`,
      );
    });

    console.log("\n📋 Checking PlaidAccounts...\n");

    const accounts = await prisma.plaidAccount.findMany({
      select: {
        id: true,
        name: true,
        officialName: true,
        plaidItemId: true,
        plaidItem: {
          select: {
            institutionName: true,
          },
        },
      },
      take: 10,
    });

    console.log(`Found ${accounts.length} PlaidAccounts (showing first 10):`);
    accounts.forEach((acc) => {
      console.log(
        `  - ${acc.officialName || acc.name} (${acc.plaidItem.institutionName})`,
      );
    });

    // Check for orphaned accounts
    const totalAccounts = await prisma.plaidAccount.count();
    console.log(`\nTotal PlaidAccounts in database: ${totalAccounts}`);
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAccounts();
