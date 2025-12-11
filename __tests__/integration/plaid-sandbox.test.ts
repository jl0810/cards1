/**
 * @jest-environment node
 */

import { describe, expect, it, beforeAll } from "@jest/globals";
import { Configuration, PlaidApi, PlaidEnvironments, Products } from "plaid";
import { PlaidProductSchema } from "@/lib/validations";
import type { z } from "zod";

type PlaidProduct = z.infer<typeof PlaidProductSchema>;

/**
 * Plaid Sandbox Integration Tests
 *
 * These tests use REAL Plaid sandbox API
 * Sandbox is free and designed for testing - no reason to skip!
 *
 * @requires PLAID_CLIENT_ID, PLAID_SECRET from env
 * @satisfies BR-033, BR-034 with real API
 * @jest-environment node - Required for real HTTP calls
 */

// Run if credentials exist, skip if not
const SHOULD_RUN = !!(process.env.PLAID_CLIENT_ID && process.env.PLAID_SECRET);

const describeIf = SHOULD_RUN ? describe : describe.skip;

describeIf("Plaid Sandbox Integration", () => {
  let plaidClient: PlaidApi;
  let sandboxAccessToken: string;

  beforeAll(() => {
    // Verify we have sandbox credentials
    if (!process.env.PLAID_CLIENT_ID || !process.env.PLAID_SECRET) {
      throw new Error("Plaid credentials not found. Add to .env.test.local");
    }

    if (process.env.PLAID_ENV !== "sandbox") {
      throw new Error('PLAID_ENV must be "sandbox" for integration tests!');
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

  describe("Sandbox Item Creation", () => {
    it("should create a sandbox item for testing", async () => {
      // Create a public token with Plaid sandbox
      const createResponse = await plaidClient.sandboxPublicTokenCreate({
        institution_id: "ins_109508", // Chase sandbox institution
        initial_products: [Products.Transactions as PlaidProduct],
      });

      expect(createResponse.data.public_token).toBeDefined();

      // Exchange for access token
      const exchangeResponse = await plaidClient.itemPublicTokenExchange({
        public_token: createResponse.data.public_token,
      });

      sandboxAccessToken = exchangeResponse.data.access_token;
      expect(sandboxAccessToken).toBeDefined();
    }, 30000); // 30 second timeout for API calls
  });

  describe("Item Get (BR-033)", () => {
    it("should retrieve item status from sandbox", async () => {
      if (!sandboxAccessToken) {
        throw new Error("Sandbox access token not created");
      }

      const response = await plaidClient.itemGet({
        access_token: sandboxAccessToken,
      });

      expect(response.data.item).toBeDefined();
      expect(response.data.item.institution_id).toBe("ins_109508");
      expect(response.data.item.error).toBeNull();
    }, 10000);
  });

  describe("Liabilities Get (accounts + balances)", () => {
    it("should retrieve accounts with liability data from sandbox", async () => {
      if (!sandboxAccessToken) {
        throw new Error("Sandbox access token not created");
      }

      const response = await plaidClient.liabilitiesGet({
        access_token: sandboxAccessToken,
      });

      expect(response.data.accounts).toBeDefined();
      expect(response.data.accounts.length).toBeGreaterThan(0);

      const account = response.data.accounts[0];
      expect(account.account_id).toBeDefined();
      expect(account.name).toBeDefined();
      expect(account.type).toBeDefined();
    }, 10000);
  });

  describe("Transactions Sync", () => {
    it("should sync transactions from sandbox", async () => {
      if (!sandboxAccessToken) {
        throw new Error("Sandbox access token not created");
      }

      const response = await plaidClient.transactionsSync({
        access_token: sandboxAccessToken,
      });

      expect(response.data).toBeDefined();
      expect(response.data.has_more).toBeDefined();
      // Sandbox may not have transactions immediately, so we just check structure
    }, 10000);
  });

  describe("Item Remove (BR-034)", () => {
    it("should successfully remove sandbox item", async () => {
      if (!sandboxAccessToken) {
        throw new Error("Sandbox access token not created");
      }

      const response = await plaidClient.itemRemove({
        access_token: sandboxAccessToken,
      });

      expect(response.data).toBeDefined();
      expect(response.status).toBe(200);
    }, 10000);
  });
});

// Always run this test to show when integration tests are skipped
describe("Plaid Integration Test Status", () => {
  it("should show whether integration tests are enabled", () => {
    if (SHOULD_RUN) {
      console.log("✅ Running Plaid sandbox integration tests");
    } else {
      console.log(
        "⏭️  Skipping Plaid sandbox tests (add PLAID_CLIENT_ID and PLAID_SECRET to .env.test.local)",
      );
    }
    expect(true).toBe(true);
  });
});
