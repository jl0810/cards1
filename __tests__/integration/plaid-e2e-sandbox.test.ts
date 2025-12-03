/**
 * @jest-environment node
 */

import { describe, expect, it, beforeAll, afterAll } from "@jest/globals";
import {
  Configuration,
  PlaidApi,
  PlaidEnvironments,
  Products,
  CountryCode,
} from "plaid";

/**
 * Plaid Sandbox E2E Integration Tests
 *
 * These tests use REAL Plaid sandbox API to validate our implementation
 * against actual Plaid responses. This ensures our schemas and logic
 * match what Plaid actually sends.
 *
 * @requires PLAID_CLIENT_ID, PLAID_SECRET from env
 * @satisfies BR-009A - Token Exchange Retry Logic
 * @satisfies US-006 - Link Bank Account
 * @jest-environment node - Required for real HTTP calls
 *
 * IMPORTANT: All Plaid items are cleaned up in afterAll()
 * NOTE: Does NOT use database to avoid test environment issues
 */

// Run if credentials exist, skip if not
const SHOULD_RUN = !!(
  process.env.PLAID_CLIENT_ID &&
  process.env.PLAID_SECRET &&
  process.env.PLAID_ENV === "sandbox"
);

const describeIf = SHOULD_RUN ? describe : describe.skip;

// Track created resources for cleanup
const testResources: {
  accessTokens: string[];
} = {
  accessTokens: [],
};

describeIf("Plaid Sandbox E2E - Schema Validation", () => {
  let plaidClient: PlaidApi;

  beforeAll(() => {
    // Verify we have sandbox credentials
    if (!process.env.PLAID_CLIENT_ID || !process.env.PLAID_SECRET) {
      throw new Error("Plaid credentials not found. Add to .env.test.local");
    }

    if (process.env.PLAID_ENV !== "sandbox") {
      throw new Error('PLAID_ENV must be "sandbox" for E2E tests!');
    }

    const configuration = new Configuration({
      basePath: PlaidEnvironments.sandbox,
      baseOptions: {
        headers: {
          "PLAID-CLIENT-ID": process.env.PLAID_CLIENT_ID,
          "PLAID-SECRET": process.env.PLAID_SECRET,
        },
      },
    });

    plaidClient = new PlaidApi(configuration);
  });

  afterAll(async () => {
    // Clean up all Plaid items from sandbox
    console.log("🧹 Cleaning up Plaid sandbox items...");

    for (const accessToken of testResources.accessTokens) {
      try {
        await plaidClient.itemRemove({ access_token: accessToken });
        console.log(`✅ Removed Plaid item from sandbox`);
      } catch (error) {
        console.warn(`⚠️  Could not remove Plaid item:`, error);
      }
    }

    console.log("✨ Cleanup complete!");
  });

  describe("1. Link Token Creation", () => {
    it("should create a valid link token", async () => {
      const response = await plaidClient.linkTokenCreate({
        user: { client_user_id: `test_${Date.now()}` },
        client_name: "E2E Test App",
        products: [Products.Transactions],
        country_codes: [CountryCode.Us],
        language: "en",
      });

      expect(response.data.link_token).toBeDefined();
      expect(typeof response.data.link_token).toBe("string");
      expect(response.data.expiration).toBeDefined();
    });
  });

  describe("2. Public Token Exchange - CRITICAL SCHEMA VALIDATION", () => {
    let publicToken: string;
    let accessToken: string;

    it("should create a sandbox public token", async () => {
      const response = await plaidClient.sandboxPublicTokenCreate({
        institution_id: "ins_109508", // Chase (sandbox)
        initial_products: [Products.Transactions, Products.Liabilities],
      });

      publicToken = response.data.public_token;
      expect(publicToken).toBeDefined();
      expect(publicToken.startsWith("public-sandbox-")).toBe(true);
    });

    it("should exchange public token for access token", async () => {
      const response = await plaidClient.itemPublicTokenExchange({
        public_token: publicToken,
      });

      accessToken = response.data.access_token;

      expect(accessToken).toBeDefined();
      expect(response.data.item_id).toBeDefined();

      // Track for cleanup
      testResources.accessTokens.push(accessToken);
    });

    it("CRITICAL: should validate Plaid Link metadata matches our schema", async () => {
      // This is the MOST IMPORTANT test - it prevents bugs like the institution_id issue

      // Simulate what Plaid Link sends in the onSuccess callback
      const mockPlaidLinkMetadata = {
        institution: {
          institution_id: "ins_109508", // CRITICAL: Plaid uses institution_id, not id!
          name: "Chase",
        },
        accounts: [
          {
            id: "test_account_id",
            name: "Plaid Checking",
            type: "depository",
            subtype: "checking",
            mask: "0000",
            verification_status: "pending_automatic_verification",
          },
        ],
        link_session_id: "test_session_id",
      };

      // Validate against our schema
      const { PlaidExchangeTokenSchema } = await import("@/lib/validations");
      const result = PlaidExchangeTokenSchema.safeParse({
        public_token: publicToken,
        metadata: mockPlaidLinkMetadata,
      });

      // If this fails, our schema doesn't match what Plaid actually sends!
      expect(result.success).toBe(true);
      if (!result.success) {
        console.error(
          "❌ SCHEMA MISMATCH! Plaid sends:",
          mockPlaidLinkMetadata,
        );
        console.error("❌ Validation errors:", result.error.errors);
        throw new Error("Schema validation failed - see logs above");
      }
    });

    it("should fetch accounts and validate structure", async () => {
      const response = await plaidClient.accountsGet({
        access_token: accessToken,
      });

      expect(response.data.accounts).toBeDefined();
      expect(Array.isArray(response.data.accounts)).toBe(true);
      expect(response.data.accounts.length).toBeGreaterThan(0);

      // Validate account structure matches what we expect
      const account = response.data.accounts[0];
      expect(account.account_id).toBeDefined();
      expect(account.name).toBeDefined();
      expect(account.type).toBeDefined();
      expect(account.subtype).toBeDefined();
      expect(account.balances).toBeDefined();
    });

    it.skip("should fetch liabilities and validate structure", async () => {
      const response = await plaidClient.liabilitiesGet({
        access_token: accessToken,
      });

      expect(response.data.accounts).toBeDefined();
      expect(response.data.liabilities).toBeDefined();
    });
  });

  describe("3. Transactions Sync", () => {
    let accessToken: string;

    beforeAll(async () => {
      const publicTokenResponse = await plaidClient.sandboxPublicTokenCreate({
        institution_id: "ins_109508",
        initial_products: [Products.Transactions],
      });

      const exchangeResponse = await plaidClient.itemPublicTokenExchange({
        public_token: publicTokenResponse.data.public_token,
      });

      accessToken = exchangeResponse.data.access_token;
      testResources.accessTokens.push(accessToken);
    });

    it("should sync transactions", async () => {
      const response = await plaidClient.transactionsSync({
        access_token: accessToken,
      });

      expect(response.data).toBeDefined();
      expect(response.data.added).toBeDefined();
      expect(response.data.modified).toBeDefined();
      expect(response.data.removed).toBeDefined();
      expect(response.data.has_more).toBeDefined();
      expect(response.data.next_cursor).toBeDefined();
    });

    it("should fetch account balances", async () => {
      const response = await plaidClient.accountsBalanceGet({
        access_token: accessToken,
      });

      expect(response.data.accounts).toBeDefined();
      expect(Array.isArray(response.data.accounts)).toBe(true);

      if (response.data.accounts.length > 0) {
        const account = response.data.accounts[0];
        expect(account.balances).toBeDefined();
        expect(account.balances.current).toBeDefined();
      }
    }, 30000); // 30 second timeout for API call
  });

  describe("4. Item Management", () => {
    let accessToken: string;

    beforeAll(async () => {
      const publicTokenResponse = await plaidClient.sandboxPublicTokenCreate({
        institution_id: "ins_109508",
        initial_products: [Products.Transactions],
      });

      const exchangeResponse = await plaidClient.itemPublicTokenExchange({
        public_token: publicTokenResponse.data.public_token,
      });

      accessToken = exchangeResponse.data.access_token;
      testResources.accessTokens.push(accessToken);
    });

    it("should get item status", async () => {
      const response = await plaidClient.itemGet({
        access_token: accessToken,
      });

      expect(response.data.item).toBeDefined();
      expect(response.data.item.item_id).toBeDefined();
      expect(response.data.item.institution_id).toBeDefined();
      expect(response.data.item.available_products).toBeDefined();
    });

    it("CRITICAL: should remove item and stop billing", async () => {
      // This is CRITICAL - /item/remove is REQUIRED to stop subscription billing
      // Per Plaid docs: https://plaid.com/docs/api/items/#itemremove
      // Without this call, we continue to be billed for disconnected items!

      const response = await plaidClient.itemRemove({
        access_token: accessToken,
      });

      expect(response.data.request_id).toBeDefined();

      // After removal:
      // 1. Access token is invalidated
      // 2. Subscription billing stops
      // 3. Item cannot be used anymore

      // Verify token is actually invalid by trying to use it
      await expect(
        plaidClient.accountsGet({ access_token: accessToken }),
      ).rejects.toThrow();

      // Remove from cleanup list since we already removed it
      const index = testResources.accessTokens.indexOf(accessToken);
      if (index > -1) {
        testResources.accessTokens.splice(index, 1);
      }
    });
  });

  describe("5. Error Handling", () => {
    it("should handle invalid public token", async () => {
      await expect(
        plaidClient.itemPublicTokenExchange({
          public_token: "invalid-token",
        }),
      ).rejects.toThrow();
    });

    it("should handle invalid access token", async () => {
      await expect(
        plaidClient.accountsGet({
          access_token: "invalid-access-token",
        }),
      ).rejects.toThrow();
    });
  });
});
