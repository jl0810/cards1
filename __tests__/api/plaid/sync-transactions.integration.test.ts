/**
 * @jest-environment node
 *
 * Unit Test for Transaction Sync (US-007)
 *
 * Tests BR-011 (Transaction Sync Limits), BR-012 (Rate Limiting), BR-013 (Atomic Processing)
 *
 * This test uses:
 * - MOCKED Prisma connection
 * - MOCKED Vault encryption/decryption
 * - MOCKED Clerk (external auth service)
 * - MOCKED Plaid API (external service)
 * - MOCKED Rate Limiting (Upstash)
 */

// Mock external services BEFORE imports
jest.mock("@/env", () => ({
  env: {
    PLAID_CLIENT_ID: "test",
    PLAID_SECRET: "test",
    PLAID_ENV: "sandbox",
  },
}));

jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}));

jest.mock("@clerk/nextjs/server", () => ({
  auth: jest.fn(),
}));

jest.mock("@/lib/rate-limit", () => ({
  rateLimit: jest.fn().mockResolvedValue(false), // Not rate limited by default
  RATE_LIMITS: {
    plaidSync: { requests: 10, window: "1 h" },
  },
}));

jest.mock("plaid", () => {
  const mockTransactionsSync = jest.fn();
  const mockAccountsBalanceGet = jest.fn();

  return {
    Configuration: jest.fn(),
    PlaidApi: jest.fn().mockImplementation(() => ({
      transactionsSync: mockTransactionsSync,
      accountsBalanceGet: mockAccountsBalanceGet,
    })),
    PlaidEnvironments: {
      sandbox: "https://sandbox.plaid.com",
    },
    __mockTransactionsSync: mockTransactionsSync,
    __mockAccountsBalanceGet: mockAccountsBalanceGet,
  };
});

// Mock benefit matcher
jest.mock("@/lib/benefit-matcher", () => ({
  scanAndMatchBenefits: jest.fn().mockResolvedValue(undefined),
  matchTransactionToBenefits: jest.fn(),
  linkTransactionToBenefit: jest.fn(),
}));

// Mock Prisma
jest.mock("@/lib/prisma", () => {
  const mockPrisma = {
    userProfile: {
      findUnique: jest.fn(),
    },
    plaidItem: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    plaidTransaction: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn().mockResolvedValue({}),
      update: jest.fn().mockResolvedValue({}),
      upsert: jest.fn().mockResolvedValue({}),
      delete: jest.fn().mockResolvedValue({}),
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
    plaidAccount: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn().mockResolvedValue({}),
      update: jest.fn().mockResolvedValue({}),
      upsert: jest.fn().mockResolvedValue({}),
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
    $queryRaw: jest.fn(),
    $transaction: jest.fn(),
    $disconnect: jest.fn(),
  };

  // Implement $transaction to call callback with mockPrisma
  (mockPrisma.$transaction as jest.Mock).mockImplementation((callback) =>
    callback(mockPrisma),
  );

  return { prisma: mockPrisma };
});

import { POST } from "@/app/api/plaid/sync-transactions/route";
import { auth } from "@clerk/nextjs/server";
import { rateLimit } from "@/lib/rate-limit";
import * as plaidModule from "plaid";
import { prisma } from "@/lib/prisma";
import { MockPlaidModuleSchema, ClerkAuthMockSchema } from "@/lib/validations";
import type { z } from "zod";
import { NextRequest } from "next/server";

type MockPlaidModule = z.infer<typeof MockPlaidModuleSchema>;
type ClerkAuthMock = z.infer<typeof ClerkAuthMockSchema>;

const mockTransactionsSync = (plaidModule as MockPlaidModule)
  .__mockTransactionsSync;
const mockAccountsBalanceGet = (plaidModule as MockPlaidModule)
  .__mockAccountsBalanceGet;

describe("Unit: Transaction Sync (US-007)", () => {
  const testUserId = "user_123";
  const testClerkId = "clerk_123";
  const testItemId = "123e4567-e89b-12d3-a456-426614174000"; // Valid UUID
  const testPlaidItemId = "plaid_item_123";
  const testAccountId = "acc_123";

  beforeEach(() => {
    jest.clearAllMocks();
    (auth as unknown as jest.Mock).mockResolvedValue({ userId: testClerkId });
    (rateLimit as jest.Mock).mockResolvedValue(false); // Not rate limited

    // Setup default Prisma mocks
    (prisma.userProfile.findUnique as jest.Mock).mockResolvedValue({
      id: testUserId,
      clerkId: testClerkId,
    });

    (prisma.plaidItem.findFirst as jest.Mock).mockResolvedValue({
      id: testItemId,
      userId: testUserId,
      itemId: testPlaidItemId,
      accessTokenId: "secret_123",
      nextCursor: "old_cursor",
      familyMemberId: "family_123",
    });

    (prisma.plaidItem.findUnique as jest.Mock).mockResolvedValue({
      id: testItemId,
      nextCursor: "old_cursor",
    });

    (prisma.$queryRaw as jest.Mock).mockResolvedValue([
      { decrypted_secret: "access-token-123" },
    ]);

    (prisma.plaidAccount.findUnique as jest.Mock).mockResolvedValue({
      accountId: testAccountId,
      currentBalance: 1000,
    });
  });

  describe("BR-012: Transaction Sync Rate Limiting", () => {
    it("should enforce rate limit (10 per hour)", async () => {
      // Mock rate limit exceeded
      (rateLimit as jest.Mock).mockResolvedValue(true);

      const request = new Request(
        "http://localhost/api/plaid/sync-transactions",
        {
          method: "POST",
          body: JSON.stringify({
            itemId: testPlaidItemId,
          }),
        },
      );

      const response = await POST(request as unknown as NextRequest);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error).toBe("Too many sync requests");
      expect(data.message).toContain("10 syncs per hour");
      expect(response.headers.get("Retry-After")).toBe("3600");
    });

    it("should allow sync when under rate limit", async () => {
      (rateLimit as jest.Mock).mockResolvedValue(false);

      mockTransactionsSync.mockResolvedValue({
        data: {
          added: [],
          modified: [],
          removed: [],
          has_more: false,
          next_cursor: "cursor_123",
        },
      });

      mockAccountsBalanceGet.mockResolvedValue({
        data: {
          accounts: [],
        },
      });

      const request = new Request(
        "http://localhost/api/plaid/sync-transactions",
        {
          method: "POST",
          body: JSON.stringify({
            itemId: testPlaidItemId,
          }),
        },
      );

      const response = await POST(request as unknown as NextRequest);

      expect(response.status).toBe(200);
      expect(rateLimit).toHaveBeenCalled();
    });
  });

  describe("BR-013: Atomic Transaction Processing", () => {
    it("should add transactions atomically", async () => {
      const txn1Id = "txn_test_1_" + Date.now();
      const txn2Id = "txn_test_2_" + Date.now();

      mockTransactionsSync.mockResolvedValue({
        data: {
          added: [
            {
              transaction_id: txn1Id,
              account_id: testAccountId,
              amount: 50.0,
              date: "2024-01-15",
              name: "Test Transaction 1",
              merchant_name: "Test Merchant 1",
              category: ["Shopping"],
              pending: false,
              payment_channel: "online",
              transaction_code: "purchase",
              personal_finance_category: {
                primary: "GENERAL_MERCHANDISE",
                detailed: "GENERAL_MERCHANDISE_OTHER",
              },
            },
            {
              transaction_id: txn2Id,
              account_id: testAccountId,
              amount: 25.0,
              date: "2024-01-16",
              name: "Test Transaction 2",
              merchant_name: "Test Merchant 2",
              category: ["Food"],
              pending: false,
              payment_channel: "in_store",
              transaction_code: "purchase",
              personal_finance_category: {
                primary: "FOOD_AND_DRINK",
                detailed: "FOOD_AND_DRINK_RESTAURANTS",
              },
            },
          ],
          modified: [],
          removed: [],
          has_more: false,
          next_cursor: "cursor_added",
        },
      });

      mockAccountsBalanceGet.mockResolvedValue({
        data: {
          accounts: [],
        },
      });

      const request = new Request(
        "http://localhost/api/plaid/sync-transactions",
        {
          method: "POST",
          body: JSON.stringify({
            itemId: testPlaidItemId,
          }),
        },
      );

      const response = await POST(request as unknown as NextRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.added).toBe(2);

      // Verify create calls (upsert)
      expect(prisma.plaidTransaction.upsert).toHaveBeenCalledTimes(2);
      expect(prisma.plaidTransaction.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            transactionId: txn1Id,
            amount: 50.0,
          }),
        }),
      );
      expect(prisma.plaidTransaction.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            transactionId: txn2Id,
            amount: 25.0,
          }),
        }),
      );
    });

    it("should modify transactions atomically", async () => {
      const existingTxnId = "txn_existing_" + Date.now();

      // Mock finding existing transaction
      (prisma.plaidTransaction.findUnique as jest.Mock).mockResolvedValue({
        transactionId: existingTxnId,
        amount: 100.0,
      });

      // Second: Modify it via sync
      mockTransactionsSync.mockResolvedValue({
        data: {
          added: [],
          modified: [
            {
              transaction_id: existingTxnId,
              account_id: testAccountId,
              amount: 150.0, // Changed
              date: "2024-01-10",
              name: "Updated Name", // Changed
              merchant_name: "Updated Merchant",
              category: ["Updated"], // Changed
              pending: false, // Changed
            },
          ],
          removed: [],
          has_more: false,
          next_cursor: "cursor_modified",
        },
      });

      mockAccountsBalanceGet.mockResolvedValue({
        data: {
          accounts: [],
        },
      });

      const request = new Request(
        "http://localhost/api/plaid/sync-transactions",
        {
          method: "POST",
          body: JSON.stringify({
            itemId: testPlaidItemId,
          }),
        },
      );

      const response = await POST(request as unknown as NextRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.modified).toBe(1);

      // Verify update call
      expect(prisma.plaidTransaction.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { transactionId: existingTxnId },
          data: expect.objectContaining({
            amount: 150.0,
            name: "Updated Name",
            pending: false,
          }),
        }),
      );
    });

    it("should remove transactions atomically", async () => {
      const removedTxnId = "txn_removed_" + Date.now();

      mockTransactionsSync.mockResolvedValue({
        data: {
          added: [],
          modified: [],
          removed: [
            {
              transaction_id: removedTxnId,
            },
          ],
          has_more: false,
          next_cursor: "cursor_removed",
        },
      });

      mockAccountsBalanceGet.mockResolvedValue({
        data: {
          accounts: [],
        },
      });

      const request = new Request(
        "http://localhost/api/plaid/sync-transactions",
        {
          method: "POST",
          body: JSON.stringify({
            itemId: testPlaidItemId,
          }),
        },
      );

      const response = await POST(request as unknown as NextRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.removed).toBe(1);

      // Verify delete call
      expect(prisma.plaidTransaction.delete).toHaveBeenCalledWith({
        where: { transactionId: removedTxnId },
      });
    });
  });

  describe("BR-011: Transaction Sync Limits", () => {
    it("should respect max iteration limit (50 iterations)", async () => {
      let callCount = 0;

      // Mock Plaid to return has_more=true for 60 iterations (exceeds limit)
      mockTransactionsSync.mockImplementation(() => {
        callCount++;
        return Promise.resolve({
          data: {
            added: [],
            modified: [],
            removed: [],
            has_more: callCount < 60, // Keep returning true
            next_cursor: `cursor_${callCount}`,
          },
        });
      });

      mockAccountsBalanceGet.mockResolvedValue({
        data: {
          accounts: [],
        },
      });

      const request = new Request(
        "http://localhost/api/plaid/sync-transactions",
        {
          method: "POST",
          body: JSON.stringify({
            itemId: testPlaidItemId,
          }),
        },
      );

      const response = await POST(request as unknown as NextRequest);

      expect(response.status).toBe(200);
      // Should stop at 50, not continue to 60
      expect(callCount).toBe(50);
    });

    it("should update cursor after successful sync", async () => {
      const newCursor = "cursor_updated_" + Date.now();

      mockTransactionsSync.mockResolvedValue({
        data: {
          added: [],
          modified: [],
          removed: [],
          has_more: false,
          next_cursor: newCursor,
        },
      });

      mockAccountsBalanceGet.mockResolvedValue({
        data: {
          accounts: [],
        },
      });

      const request = new Request(
        "http://localhost/api/plaid/sync-transactions",
        {
          method: "POST",
          body: JSON.stringify({
            itemId: testItemId,
          }),
        },
      );

      const response = await POST(request as unknown as NextRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.nextCursor).toBe(newCursor);

      // Verify: Cursor saved in database
      expect(prisma.plaidItem.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: testItemId },
          data: expect.objectContaining({ nextCursor: newCursor }),
        }),
      );
    });
  });

  describe("Balance Updates", () => {
    it("should update account balances after sync", async () => {
      mockTransactionsSync.mockResolvedValue({
        data: {
          added: [],
          modified: [],
          removed: [],
          has_more: false,
          next_cursor: "cursor_balance",
        },
      });

      mockAccountsBalanceGet.mockResolvedValue({
        data: {
          accounts: [
            {
              account_id: testAccountId,
              name: "Updated Account Name",
              official_name: "Updated Official Name",
              mask: "1234",
              type: "depository",
              subtype: "checking",
              balances: {
                current: 5000.0,
                available: 4500.0,
                limit: null,
                iso_currency_code: "USD",
              },
            },
          ],
        },
      });

      const request = new Request(
        "http://localhost/api/plaid/sync-transactions",
        {
          method: "POST",
          body: JSON.stringify({
            itemId: testPlaidItemId,
          }),
        },
      );

      const response = await POST(request as unknown as NextRequest);

      expect(response.status).toBe(200);

      // Verify: Balance updated
      expect(prisma.plaidAccount.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { accountId: testAccountId },
          update: expect.objectContaining({
            currentBalance: 5000.0,
            availableBalance: 4500.0,
          }),
        }),
      );
    });
  });

  describe("Error Handling", () => {
    it("should return 401 if user not authenticated", async () => {
      (auth as unknown as jest.Mock).mockResolvedValue({ userId: null });

      const request = new Request(
        "http://localhost/api/plaid/sync-transactions",
        {
          method: "POST",
          body: JSON.stringify({
            itemId: testPlaidItemId,
          }),
        },
      );

      const response = await POST(request as unknown as NextRequest);
      expect(response.status).toBe(401);
    });

    it("should return 400 if itemId missing", async () => {
      const request = new Request(
        "http://localhost/api/plaid/sync-transactions",
        {
          method: "POST",
          body: JSON.stringify({}),
        },
      );

      const response = await POST(request as unknown as NextRequest);
      expect(response.status).toBe(400);
    });

    it("should return 404 if item not found", async () => {
      (prisma.plaidItem.findUnique as jest.Mock).mockResolvedValue(null);

      const request = new Request(
        "http://localhost/api/plaid/sync-transactions",
        {
          method: "POST",
          body: JSON.stringify({
            itemId: "nonexistent_item_id",
          }),
        },
      );

      const response = await POST(request as unknown as NextRequest);
      expect(response.status).toBe(404);
    });

    it("should handle Plaid API errors gracefully", async () => {
      mockTransactionsSync.mockRejectedValue(new Error("ITEM_LOGIN_REQUIRED"));

      mockAccountsBalanceGet.mockResolvedValue({
        data: {
          accounts: [],
        },
      });

      const request = new Request(
        "http://localhost/api/plaid/sync-transactions",
        {
          method: "POST",
          body: JSON.stringify({
            itemId: testPlaidItemId,
          }),
        },
      );

      const response = await POST(request as unknown as NextRequest);
      expect(response.status).toBe(200);
    });
  });
});
