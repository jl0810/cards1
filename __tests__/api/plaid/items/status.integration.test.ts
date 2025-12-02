/**
 * @jest-environment node
 *
 * Unit Test for Plaid Item Status
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
  // Use a factory function to access mockItemGet
  const mockItemGetFn = jest.fn();
  return {
    Configuration: jest.fn(),
    PlaidApi: jest.fn().mockImplementation(() => ({
      itemGet: mockItemGetFn,
    })),
    PlaidEnvironments: {
      sandbox: "https://sandbox.plaid.com",
    },
    // Export the mock so we can access it in tests
    __mockItemGet: mockItemGetFn,
  };
});

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
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    $queryRaw: jest.fn(),
    $disconnect: jest.fn(),
  },
}));

import { GET } from "@/app/api/plaid/items/[itemId]/status/route";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import * as plaidModule from "plaid";

// Get the mock function from the mocked module
import { MockPlaidModuleSchema, ClerkAuthMockSchema } from "@/lib/validations";
import type { z } from "zod";

type MockPlaidModule = z.infer<typeof MockPlaidModuleSchema>;
type ClerkAuthMock = z.infer<typeof ClerkAuthMockSchema>;

const mockItemGetFn = (plaidModule as MockPlaidModule).__mockItemGet;

describe("Unit: Plaid Item Status", () => {
  const testUserId = "user_123";
  const testClerkId = "clerk_123";
  const testItemId = "item_123";

  beforeEach(async () => {
    jest.clearAllMocks();

    // Setup default mocks
    (prisma.plaidItem.findUnique as jest.Mock).mockResolvedValue({
      id: testItemId,
      userId: testUserId,
      accessTokenId: "secret_123",
      status: "active",
    });

    (prisma.plaidItem.findFirst as jest.Mock).mockResolvedValue({
      id: testItemId,
      userId: testUserId,
      accessTokenId: "secret_123",
      status: "active",
    });

    (prisma.userProfile.findUnique as jest.Mock).mockResolvedValue({
      id: testUserId,
      clerkId: testClerkId,
    });

    (prisma.$queryRaw as jest.Mock).mockResolvedValue([
      { decrypted_secret: "test-access-token-123" },
    ]);
  });

  it("should retrieve token from Vault and call Plaid", async () => {
    (auth as ClerkAuthMock).mockResolvedValue({ userId: testClerkId });

    // Mock ownership check
    (prisma.plaidItem.findFirst as jest.Mock).mockResolvedValue({
      id: testItemId,
      userId: testUserId,
      accessTokenId: "secret_123",
      status: "active",
    });

    mockItemGetFn.mockResolvedValue({
      data: {
        item: {
          institution_id: "ins_test",
          error: null,
        },
      },
    });

    const request = new Request(
      `http://localhost/api/plaid/items/${testItemId}/status`,
    );
    const params = Promise.resolve({ itemId: testItemId });

    const response = await GET(request, { params });
    const data = await response.json();

    // Verify it worked
    expect(response.status).toBe(200);
    expect(data.status).toBe("active");

    // Verify Plaid was called with token from Vault
    expect(mockItemGetFn).toHaveBeenCalled();
    const plaidCall = mockItemGetFn.mock.calls[0][0];
    expect(plaidCall.access_token).toBe("test-access-token-123");
  });

  it("should fail if Vault secret does not exist", async () => {
    (auth as ClerkAuthMock).mockResolvedValue({ userId: testClerkId });
    (prisma.$queryRaw as jest.Mock).mockResolvedValue([]); // No secret found

    const request = new Request(
      `http://localhost/api/plaid/items/${testItemId}/status`,
    );
    const params = Promise.resolve({ itemId: testItemId });

    const response = await GET(request, { params });

    expect(response.status).toBe(404);
  });

  it("should detect needs_reauth status (BR-033)", async () => {
    (auth as ClerkAuthMock).mockResolvedValue({ userId: testClerkId });
    mockItemGetFn.mockResolvedValue({
      data: {
        item: {
          institution_id: "ins_test",
          error: {
            error_code: "ITEM_LOGIN_REQUIRED",
            error_message: "User needs to re-authenticate",
          },
        },
      },
    });

    const request = new Request(
      `http://localhost/api/plaid/items/${testItemId}/status`,
    );
    const params = Promise.resolve({ itemId: testItemId });

    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe("needs_reauth");
    expect(data.error.error_code).toBe("ITEM_LOGIN_REQUIRED");

    // Verify database was updated
    expect(prisma.plaidItem.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: testItemId },
        data: expect.objectContaining({ status: "needs_reauth" }),
      }),
    );
  });

  it("should detect error status for other Plaid errors (BR-033)", async () => {
    (auth as ClerkAuthMock).mockResolvedValue({ userId: testClerkId });
    mockItemGetFn.mockResolvedValue({
      data: {
        item: {
          institution_id: "ins_test",
          error: {
            error_code: "INSTITUTION_DOWN",
            error_message: "Institution is temporarily unavailable",
          },
        },
      },
    });

    const request = new Request(
      `http://localhost/api/plaid/items/${testItemId}/status`,
    );
    const params = Promise.resolve({ itemId: testItemId });

    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe("error");
    expect(data.error.error_code).toBe("INSTITUTION_DOWN");
  });

  it("should update lastSyncedAt timestamp (BR-033)", async () => {
    (auth as ClerkAuthMock).mockResolvedValue({ userId: testClerkId });
    mockItemGetFn.mockResolvedValue({
      data: {
        item: {
          institution_id: "ins_test",
          error: null,
        },
      },
    });

    const request = new Request(
      `http://localhost/api/plaid/items/${testItemId}/status`,
    );
    const params = Promise.resolve({ itemId: testItemId });

    await GET(request, { params });

    expect(prisma.plaidItem.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: testItemId },
        data: expect.objectContaining({ lastSyncedAt: expect.any(Date) }),
      }),
    );
  });

  it("should return 401 if not authenticated", async () => {
    (auth as unknown as jest.Mock).mockResolvedValue({ userId: null });

    const request = new Request(
      `http://localhost/api/plaid/items/${testItemId}/status`,
    );
    const params = Promise.resolve({ itemId: testItemId });

    const response = await GET(request, { params });

    expect(response.status).toBe(401);
  });

  it("should return 404 if user profile not found", async () => {
    (auth as unknown as jest.Mock).mockResolvedValue({
      userId: "nonexistent_user",
    });
    (prisma.userProfile.findUnique as jest.Mock).mockResolvedValue(null);

    const request = new Request(
      `http://localhost/api/plaid/items/${testItemId}/status`,
    );
    const params = Promise.resolve({ itemId: testItemId });

    const response = await GET(request, { params });

    expect(response.status).toBe(404);
  });

  it("should return 404 if item belongs to different user", async () => {
    (auth as unknown as jest.Mock).mockResolvedValue({ userId: "other_user" });
    (prisma.userProfile.findUnique as jest.Mock).mockResolvedValue({
      id: "other_user_id",
      clerkId: "other_user",
    });
    (prisma.plaidItem.findFirst as jest.Mock).mockResolvedValue(null); // Item not found for this user

    const request = new Request(
      `http://localhost/api/plaid/items/${testItemId}/status`,
    );
    const params = Promise.resolve({ itemId: testItemId });

    const response = await GET(request, { params });

    expect(response.status).toBe(404);
  });

  it("should include consent expiration time if available", async () => {
    (auth as ClerkAuthMock).mockResolvedValue({ userId: testClerkId });
    const expirationTime = "2025-12-31T23:59:59Z";
    mockItemGetFn.mockResolvedValue({
      data: {
        item: {
          institution_id: "ins_test",
          error: null,
          consent_expiration_time: expirationTime,
        },
      },
    });

    const request = new Request(
      `http://localhost/api/plaid/items/${testItemId}/status`,
    );
    const params = Promise.resolve({ itemId: testItemId });

    const response = await GET(request, { params });
    const data = await response.json();

    expect(data.consentExpirationTime).toBe(expirationTime);
  });

  it("should handle Plaid API errors gracefully", async () => {
    (auth as ClerkAuthMock).mockResolvedValue({ userId: testClerkId });
    mockItemGetFn.mockRejectedValue(new Error("Plaid API timeout"));

    const request = new Request(
      `http://localhost/api/plaid/items/${testItemId}/status`,
    );
    const params = Promise.resolve({ itemId: testItemId });

    const response = await GET(request, { params });

    expect(response.status).toBe(500);
  });
});
