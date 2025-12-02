import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function checkChaseItems() {
  try {
    console.log("\n🔍 Checking Chase Items...\n");

    const items = await prisma.plaidItem.findMany({
      where: {
        institutionName: {
          contains: "Chase",
          mode: "insensitive",
        },
      },
      select: {
        id: true,
        itemId: true,
        institutionName: true,
        accessTokenId: true, // This is the link to the Vault
        createdAt: true,
        _count: {
          select: {
            accounts: true,
          },
        },
      },
    });

    console.log(`Found ${items.length} Chase items:`);

    for (const item of items) {
      console.log(`\nItem ID: ${item.id}`);
      console.log(`Plaid Item ID: ${item.itemId}`);
      console.log(`Institution: ${item.institutionName}`);
      console.log(`Access Token ID (Vault): ${item.accessTokenId}`);
      console.log(`Created At: ${item.createdAt}`);
      console.log(`Linked Accounts: ${item._count.accounts}`);

      // Verify if we can retrieve the secret (simulated)
      const vaultResult = await prisma.$queryRaw`
        SELECT id FROM vault.decrypted_secrets WHERE id = ${item.accessTokenId}::uuid;
      `;

      const secretExists = Array.isArray(vaultResult) && vaultResult.length > 0;
      console.log(`✅ Vault Secret Exists: ${secretExists}`);
    }
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkChaseItems();
