import { prisma } from "../lib/prisma";
import { plaidClient } from "../lib/plaid";

async function testToken() {
  try {
    console.log("🔍 Testing Access Token for Chase Item...");

    // 1. Get the item and secret ID
    const item = await prisma.plaidItem.findUnique({
      where: { id: "cmi8wixts0001o43kx0q6nkdv" },
    });

    if (!item) {
      console.error("❌ Item not found!");
      return;
    }

    console.log(`✅ Found Item: ${item.institutionName} (${item.id})`);
    console.log(`   Access Token ID: ${item.accessTokenId}`);

    // 2. Get the secret from Vault
    const vaultResult = await prisma.$queryRaw<
      Array<{ decrypted_secret: string }>
    >`
      SELECT decrypted_secret FROM vault.decrypted_secrets WHERE id = ${item.accessTokenId}::uuid;
    `;

    const accessToken = vaultResult[0]?.decrypted_secret;

    if (!accessToken) {
      console.error("❌ Failed to retrieve access token from Vault!");
      return;
    }

    console.log("✅ Retrieved Access Token from Vault");

    // 3. Try to fetch accounts from Plaid
    console.log("🔄 Fetching accounts from Plaid...");
    const response = await plaidClient.accountsGet({
      access_token: accessToken,
    });

    console.log(`✅ Success! Found ${response.data.accounts.length} accounts:`);
    response.data.accounts.forEach((acc) => {
      console.log(`   - ${acc.name} (${acc.mask}) - ${acc.subtype}`);
    });
  } catch (error) {
    console.error("❌ Error:", error);
    if (error.response) {
      console.error("   Plaid Error:", error.response.data);
    }
  } finally {
    await prisma.$disconnect();
  }
}

testToken();
