/**
 * @jest-environment node
 *
 * Integration Test for Smart Fix Adoption Logic
 *
 * Tests that when a new item is linked, it adopts settings (AccountExtended)
 * from any matching inactive accounts (Soft Delete recovery).
 */

import { POST } from "@/app/api/plaid/exchange-public-token/route";
import { auth } from "@clerk/nextjs/server";
import * as plaidModule from "plaid";
import { prisma } from "@/lib/prisma";
import { MockPlaidModuleSchema } from "@/lib/validations";
import type { z } from "zod";
import { NextRequest } from "next/server";

// Mock external services
jest.mock("@/env", () => ({
  env: {
    PLAID_CLIENT_ID: "test",
    PLAID_SECRET: "test",
    PLAID_ENV: "sandbox",
    NEXT_PUBLIC_APP_URL: "http://localhost:3000",
  },
}));

jest.mock("@clerk/nextjs/server", () => ({
  auth: jest.fn(),
}));

jest.mock("plaid", () => {
  const mockItemPublicTokenExchange = jest.fn();
  const mockLiabilitiesGet = jest.fn();
  const mockAccountsGet = jest.fn();

  return {
    Configuration: jest.fn(),
    PlaidApi: jest.fn().mockImplementation(() => ({
      itemPublicTokenExchange: mockItemPublicTokenExchange,
      liabilitiesGet: mockLiabilitiesGet,
      accountsGet: mockAccountsGet,
    })),
    PlaidEnvironments: {
      sandbox: "https://sandbox.plaid.com",
    },
    __mockItemPublicTokenExchange: mockItemPublicTokenExchange,
    __mockLiabilitiesGet: mockLiabilitiesGet,
    __mockAccountsGet: mockAccountsGet,
  };
});

// Mock fetch
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: async () => ({}),
  } as Response),
);

// Mock Prisma
jest.mock("@/lib/prisma", () => ({
  prisma: {
    userProfile: { findUnique: jest.fn() },
    familyMember: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    plaidItem: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    plaidAccount: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    accountExtended: { update: jest.fn() },
    plaidInstitution: { upsert: jest.fn() },
    $queryRaw: jest.fn(),
    $disconnect: jest.fn(),
  },
}));

jest.mock("@/lib/rate-limit", () => ({
  rateLimit: jest.fn().mockResolvedValue(false),
  RATE_LIMITS: { auth: 10, sensitive: 5 },
}));

type MockPlaidModule = z.infer<typeof MockPlaidModuleSchema>;
const mockItemPublicTokenExchange = (plaidModule as MockPlaidModule)
  .__mockItemPublicTokenExchange;
const mockLiabilitiesGet = (plaidModule as MockPlaidModule)
  .__mockLiabilitiesGet;

describe("Integration: Smart Fix Adoption", () => {
  const testUserId = "user_123";
  const testClerkId = "clerk_123";
  const testFamilyMemberId = "family_123";

  beforeEach(() => {
    jest.clearAllMocks();
    (auth as unknown as jest.Mock).mockResolvedValue({ userId: testClerkId });

    (prisma.userProfile.findUnique as jest.Mock).mockResolvedValue({
      id: testUserId,
      clerkId: testClerkId,
      name: "Test User",
    });

    (prisma.familyMember.findFirst as jest.Mock).mockResolvedValue({
      id: testFamilyMemberId,
      userId: testUserId,
      isPrimary: true,
      name: "Test User",
    });

    (prisma.$queryRaw as jest.Mock).mockResolvedValue([{ id: "secret_123" }]);
  });

  it("should adopt settings from inactive account when re-linking", async () => {
    // 1. Mock Plaid Exchange
    mockItemPublicTokenExchange.mockResolvedValue({
      data: { access_token: "access_new", item_id: "item_new" },
    });

    mockLiabilitiesGet.mockResolvedValue({
      data: {
        accounts: [
          {
            account_id: "acc_new_1",
            name: "Checking",
            mask: "1234",
            type: "depository",
            subtype: "checking",
            balances: {
              current: 100,
              available: 100,
              iso_currency_code: "USD",
            },
          },
        ],
        liabilities: { credit: [] },
      },
    });

    // 2. Mock Prisma Responses
    // Mock findMany to handle both duplicate check and adoption loop
    (prisma.plaidAccount.findMany as jest.Mock).mockImplementation((args) => {
      // Duplicate check uses 'mask' in where clause
      if (args?.where?.mask) return Promise.resolve([]);

      // Adoption loop uses 'plaidItemId'
      if (args?.where?.plaidItemId === "item_new_db") {
        return Promise.resolve([
          {
            id: "acc_new_db_1",
            mask: "1234",
            familyMemberId: testFamilyMemberId,
            plaidItemId: "item_new_db",
          },
        ]);
      }
      return Promise.resolve([]);
    });

    // Create Item returns new item
    (prisma.plaidItem.create as jest.Mock).mockResolvedValue({
      id: "item_new_db",
      familyMemberId: testFamilyMemberId,
    });
    // Mock finding OLD inactive account
    (prisma.plaidAccount.findFirst as jest.Mock).mockResolvedValue({
      id: "acc_old_db_1",
      mask: "1234",
      status: "inactive",
      extended: { id: "ext_123", nickname: "My Checking" },
    });

    // 3. Execute Request
    const request = new Request(
      "http://localhost/api/plaid/exchange-public-token",
      {
        method: "POST",
        body: JSON.stringify({
          public_token: "public_token",
          metadata: {
            institution: { institution_id: "ins_1", name: "Bank" },
            accounts: [],
          },
        }),
      },
    );

    const response = await POST(request as unknown as NextRequest);
    expect(response.status).toBe(200);

    // 4. Verify Adoption
    // Should search for inactive account
    expect(prisma.plaidAccount.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          mask: "1234",
          status: "inactive",
        }),
      }),
    );

    // Should move Extended Data
    expect(prisma.accountExtended.update).toHaveBeenCalledWith({
      where: { id: "ext_123" },
      data: { plaidAccountId: "acc_new_db_1" },
    });

    // Should mark old account as replaced
    expect(prisma.plaidAccount.update).toHaveBeenCalledWith({
      where: { id: "acc_old_db_1" },
      data: { status: "replaced" },
    });
  });
});
