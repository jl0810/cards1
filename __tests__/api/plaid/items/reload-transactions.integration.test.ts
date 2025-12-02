/**
 * @jest-environment node
 *
 * Unit Test for Transaction Reload (Dump & Reload)
 *
 * Tests BR-036 - Full Transaction Reload & Data Loss Warning
 * Tests US-022 - Full Transaction Reload
 *
 * This test uses:
 * - MOCKED Prisma connection
 * - MOCKED Vault encryption/decryption
 * - MOCKED Clerk (external auth service)
 * - MOCKED Plaid API (external service)
 */

// Mock external services BEFORE imports
jest.mock("@/env", () => ({
  env: {
    PLAID_CLIENT_ID: "test",
    PLAID_SECRET: "test",
    PLAID_ENV: "sandbox",
  },
}));

jest.mock("@clerk/nextjs/server", () => ({
  auth: jest.fn(),
}));

jest.mock("plaid", () => {
  const mockTransactionsSync = jest.fn();
  return {
    Configuration: jest.fn(),
    PlaidApi: jest.fn().mockImplementation(() => ({
      transactionsSync: mockTransactionsSync,
    })),
    PlaidEnvironments: {
      sandbox: "https://sandbox.plaid.com",
    },
    __mockTransactionsSync: mockTransactionsSync,
  };
});

jest.mock("@/lib/benefit-matcher", () => ({
  scanAndMatchBenefits: jest.fn().mockResolvedValue(undefined),
}));

// Mock Prisma
jest.mock("@/lib/prisma", () => ({
  prisma: {
    userProfile: {
      create: jest.fn(),
      delete: jest.fn(),
      findUnique: jest.fn(),
    },
    familyMember: {
      create: jest.fn(),
      delete: jest.fn(),
    },
    plaidItem: {
      create: jest.fn(),
      delete: jest.fn(),
      update: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
    },
    plaidAccount: {
      create: jest.fn(),
      deleteMany: jest.fn(),
      findMany: jest.fn(),
    },
    plaidTransaction: {
      create: jest.fn(),
      deleteMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      createMany: jest.fn(),
    },
    $queryRaw: jest.fn(),
    $disconnect: jest.fn(),
    $transaction: jest.fn((callback) => callback(prisma)),
  },
}));

import { POST } from "@/app/api/plaid/items/[itemId]/reload-transactions/route";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import * as plaidModule from "plaid";
import { MockPlaidModuleSchema, ClerkAuthMockSchema } from "@/lib/validations";
import type { z } from "zod";

type MockPlaidModule = z.infer<typeof MockPlaidModuleSchema>;
type ClerkAuthMock = z.infer<typeof ClerkAuthMockSchema>;

const mockTransactionsSync = (plaidModule as MockPlaidModule)
  .__mockTransactionsSync;

describe("Unit: Transaction Reload (US-022, BR-036)", () => {
  const testUserId = "user_123";
  const testClerkId = "clerk_123";
  const testFamilyMemberId = "family_123";
  const testItemId = "item_123";
  const testAccountId = "acc_123";

  beforeEach(async () => {
    jest.clearAllMocks();

    // Setup default mocks
    (prisma.plaidItem.findUnique as jest.Mock).mockResolvedValue({
      id: testItemId,
      userId: testUserId,
      accessTokenId: "secret_123",
      nextCursor: "old_cursor",
    });

    (prisma.plaidItem.findFirst as jest.Mock).mockResolvedValue({
      id: testItemId,
      userId: testUserId,
      accessTokenId: "secret_123",
      _count: { transactions: 2 },
    });

    (prisma.$queryRaw as jest.Mock).mockResolvedValue([
      { decrypted_secret: "access-token-123" },
    ]);

    // Mock accounts for filtering
    (prisma.plaidAccount.findMany as jest.Mock).mockResolvedValue([
      { accountId: testAccountId },
    ]);
  });

  it('should require confirmation "RELOAD" (BR-036)', async () => {
    (auth as ClerkAuthMock).mockResolvedValue({ userId: testClerkId });
    (prisma.plaidItem.findUnique as jest.Mock).mockResolvedValue({
      userId: testClerkId,
    }); // Mock ownership check

    const request = new Request(
      `http://localhost/api/plaid/items/${testItemId}/reload-transactions`,
      {
        method: "POST",
        body: JSON.stringify({ confirmation: "WRONG" }),
      },
    );

    const response = await POST(request, {
      params: Promise.resolve({ itemId: testItemId }),
    });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("Confirmation required");
  });

  it("should delete all existing transactions and reload from Plaid (BR-036)", async () => {
    (auth as ClerkAuthMock).mockResolvedValue({ userId: testClerkId });

    // Mock ownership check
    (prisma.plaidItem.findFirst as jest.Mock).mockResolvedValue({
      id: testItemId,
      userId: "profile_id_123", // User profile ID
      accessTokenId: "secret_123",
      _count: { transactions: 2 },
    });

    (prisma.userProfile.findUnique as jest.Mock).mockResolvedValue({
      id: "profile_id_123",
      clerkId: testClerkId,
    });

    // Mock Plaid to return new transactions
    mockTransactionsSync.mockResolvedValue({
      data: {
        added: [
          {
            transaction_id: "txn_new_1",
            account_id: testAccountId,
            amount: 100.0,
            date: "2024-02-01",
            name: "New Transaction 1",
            merchant_name: "Test Merchant",
            category: ["Food"],
            pending: false,
            payment_channel: "online",
          },
          {
            transaction_id: "txn_new_2",
            account_id: testAccountId,
            amount: 200.0,
            date: "2024-02-02",
            name: "New Transaction 2",
            merchant_name: null,
            category: ["Shopping"],
            pending: false,
            payment_channel: "in store",
          },
        ],
        modified: [],
        removed: [],
        has_more: false,
        next_cursor: "new_cursor_456",
      },
    });

    // Mock count
    (prisma.plaidTransaction.count as jest.Mock).mockResolvedValue(2);

    const request = new Request(
      `http://localhost/api/plaid/items/${testItemId}/reload-transactions`,
      {
        method: "POST",
        body: JSON.stringify({ confirmation: "RELOAD" }),
      },
    );

    const response = await POST(request, {
      params: Promise.resolve({ itemId: testItemId }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.deletedCount).toBe(2);
    expect(data.reloadedCount).toBe(2);

    // Verify DB calls
    expect(prisma.plaidItem.update).toHaveBeenCalledWith({
      where: { id: testItemId },
      data: { nextCursor: null, lastSyncedAt: null },
    });

    expect(prisma.plaidTransaction.deleteMany).toHaveBeenCalledWith({
      where: { plaidItemId: testItemId },
    });

    // Verify create calls (loop)
    expect(prisma.plaidTransaction.create).toHaveBeenCalledTimes(2);
    expect(prisma.plaidTransaction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          transactionId: "txn_new_1",
          amount: 100.0,
        }),
      }),
    );

    // Verify cursor update
    expect(prisma.plaidItem.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: testItemId },
        data: expect.objectContaining({ nextCursor: "new_cursor_456" }),
      }),
    );
  });

  it("should reset cursor to null before fetching (BR-036)", async () => {
    (auth as ClerkAuthMock).mockResolvedValue({ userId: testClerkId });

    mockTransactionsSync.mockResolvedValue({
      data: {
        added: [],
        modified: [],
        removed: [],
        has_more: false,
        next_cursor: "final_cursor",
      },
    });

    const request = new Request(
      `http://localhost/api/plaid/items/${testItemId}/reload-transactions`,
      {
        method: "POST",
        body: JSON.stringify({ confirmation: "RELOAD" }),
      },
    );

    await POST(request, { params: Promise.resolve({ itemId: testItemId }) });

    // Verify Plaid was called with cursor=undefined (null converted to undefined)
    expect(mockTransactionsSync).toHaveBeenCalledWith({
      access_token: expect.any(String),
      cursor: undefined,
    });
  });

  it("should return 401 if not authenticated", async () => {
    (auth as ClerkAuthMock).mockResolvedValue({ userId: null });

    const request = new Request(
      `http://localhost/api/plaid/items/${testItemId}/reload-transactions`,
      {
        method: "POST",
        body: JSON.stringify({ confirmation: "RELOAD" }),
      },
    );

    const response = await POST(request, {
      params: Promise.resolve({ itemId: testItemId }),
    });

    expect(response.status).toBe(401);
  });

  it("should return 404 if item not found or not owned", async () => {
    (auth as ClerkAuthMock).mockResolvedValue({ userId: "wrong_user" });
    (prisma.plaidItem.findFirst as jest.Mock).mockResolvedValue(null);

    const request = new Request(
      `http://localhost/api/plaid/items/${testItemId}/reload-transactions`,
      {
        method: "POST",
        body: JSON.stringify({ confirmation: "RELOAD" }),
      },
    );

    const response = await POST(request, {
      params: Promise.resolve({ itemId: testItemId }),
    });

    expect(response.status).toBe(404);
  });

  it("should handle Plaid API errors gracefully", async () => {
    (auth as ClerkAuthMock).mockResolvedValue({ userId: testClerkId });
    (prisma.plaidItem.findUnique as jest.Mock).mockResolvedValue({
      id: testItemId,
      userId: testClerkId,
      accessTokenId: "secret_123",
    });

    mockTransactionsSync.mockRejectedValue(new Error("Plaid API error"));

    const request = new Request(
      `http://localhost/api/plaid/items/${testItemId}/reload-transactions`,
      {
        method: "POST",
        body: JSON.stringify({ confirmation: "RELOAD" }),
      },
    );

    const response = await POST(request, {
      params: Promise.resolve({ itemId: testItemId }),
    });

    expect(response.status).toBe(500);
  });
});
