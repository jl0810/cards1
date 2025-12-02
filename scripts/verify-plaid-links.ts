import * as dotenv from "dotenv";
dotenv.config();

import { Configuration, PlaidApi, PlaidEnvironments } from "plaid";

const configuration = new Configuration({
  basePath: PlaidEnvironments[process.env.PLAID_ENV || "sandbox"],
  baseOptions: {
    headers: {
      "PLAID-CLIENT-ID": process.env.PLAID_CLIENT_ID,
      "PLAID-SECRET": process.env.PLAID_SECRET,
    },
  },
});

const plaidClient = new PlaidApi(configuration);

const TOKENS = [
  {
    name: "Chase Account (J. LAWSON)",
    token: "access-production-00b21477-9c4e-4f4e-a9ea-dd54500f0d88",
  },
  {
    name: "Chase Account (K. LAWSON)",
    token: "access-production-a8953335-bed3-4def-b7d5-66c534212ae7",
  },
];

async function verifyPlaidLinks() {
  console.log("🔍 Verifying Plaid Item Status via API...\n");

  for (const { name, token } of TOKENS) {
    console.log(`Checking: ${name}`);
    console.log(`Token: ${token.substring(0, 20)}...`);

    try {
      // Get Accounts
      const response = await plaidClient.accountsGet({
        access_token: token,
      });

      const item = response.data.item;
      const accounts = response.data.accounts;

      console.log(`✅ Success! Item ID: ${item.item_id}`);
      console.log(`   Institution ID: ${item.institution_id}`);
      console.log(`   Accounts Found: ${accounts.length}`);

      accounts.forEach((acc) => {
        console.log(`   - [${acc.mask}] ${acc.name}`);
        console.log(`     Type: ${acc.subtype} | ID: ${acc.account_id}`);
      });

      console.log("\n" + "=".repeat(50) + "\n");
    } catch (error: any) {
      console.error(`❌ Error fetching ${name}:`);
      if (error.response) {
        console.error(JSON.stringify(error.response.data, null, 2));
      } else {
        console.error(error.message);
      }
      console.log("\n" + "=".repeat(50) + "\n");
    }
  }
}

verifyPlaidLinks();
