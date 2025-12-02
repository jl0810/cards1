/**
 * Tests for Plaid Item Disconnect API
 *
 * Tests proper /item/remove implementation for US-020
 * Verifies Plaid API call, billing stop, and status updates
 *
 * @implements Plaid /item/remove requirement
 * @satisfies US-020 - Monitor Bank Connection Health
 * @satisfies US-006 - Link Bank Account (disconnect capability)
 * @see https://plaid.com/docs/api/items/#itemremove
 */

import { POST } from "@/app/api/plaid/items/[itemId]/disconnect/route";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { plaidClient } from "@/lib/plaid";

// Mock dependencies
jest.mock("@clerk/nextjs/server", () => ({
  auth: jest.fn(),
}));

jest.mock("@/lib/plaid", () => ({
  plaidClient: {
    itemRemove: jest.fn(),
  },
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    userProfile: {
      findUnique: jest.fn(),
    },
    plaidItem: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    $queryRaw: jest.fn(),
  },
}));

describe("US-020 & US-006: Bank Connection Disconnect", () => {
  const mockUserId = "user_test123";
  const mockUserProfileId = "profile_test123";
  const mockItemId = "item_test123";
  const mockAccessToken = "access-sandbox-test-token";

  beforeEach(() => {
    jest.clearAllMocks();

    // Default auth mock
    (auth as jest.Mock).mockResolvedValue({ userId: mockUserId });

    // Default user profile mock
    (prisma.userProfile.findUnique as jest.Mock).mockResolvedValue({
      id: mockUserProfileId,
      clerkId: mockUserId,
    });

    // Default Plaid item mock
    (prisma.plaidItem.findFirst as jest.Mock).mockResolvedValue({
      id: mockItemId,
      userId: mockUserProfileId,
      institutionId: "ins_test",
      institutionName: "Test Bank",
      itemId: "plaid_item_123",
      status: "active",
      accessTokenId: "vault_secret_123",
    });

    // Mock vault query to return access token
    (prisma.$queryRaw as jest.Mock).mockResolvedValue([
      { decrypted_secret: mockAccessToken },
    ]);

    // Mock Plaid itemRemove
    (plaidClient.itemRemove as jest.Mock).mockResolvedValue({
      data: { request_id: "req_test_123" },
    });

    // Default update mock
    (prisma.plaidItem.update as jest.Mock).mockResolvedValue({
      id: mockItemId,
      status: "disconnected",
    });
  });

  describe("CRITICAL: Plaid /item/remove Call", () => {
    it("should call Plaid itemRemove API to stop billing", async () => {
      const mockRequest = new Request(
        "http://localhost/api/plaid/items/item_test123/disconnect",
        {
          method: "POST",
        },
      );
      const mockParams = Promise.resolve({ itemId: mockItemId });

      const response = await POST(mockRequest, { params: mockParams });

      // Verify success
      expect(response.status).toBe(200);

      // CRITICAL: Verify Plaid API was called
      expect(plaidClient.itemRemove).toHaveBeenCalledWith({
        access_token: mockAccessToken,
      });
      expect(plaidClient.itemRemove).toHaveBeenCalledTimes(1);
    });

    it("should retrieve access token from Vault before calling Plaid", async () => {
      const mockRequest = new Request(
        "http://localhost/api/plaid/items/item_test123/disconnect",
        {
          method: "POST",
        },
      );
      const mockParams = Promise.resolve({ itemId: mockItemId });

      await POST(mockRequest, { params: mockParams });

      // Verify vault query was called
      expect(prisma.$queryRaw).toHaveBeenCalled();

      // Verify Plaid was called with the token from vault
      expect(plaidClient.itemRemove).toHaveBeenCalledWith({
        access_token: mockAccessToken,
      });
    });

    it("should still mark as disconnected even if Plaid call fails", async () => {
      // Simulate Plaid API error
      (plaidClient.itemRemove as jest.Mock).mockRejectedValue(
        new Error("Plaid API error"),
      );

      const mockRequest = new Request(
        "http://localhost/api/plaid/items/item_test123/disconnect",
        {
          method: "POST",
        },
      );
      const mockParams = Promise.resolve({ itemId: mockItemId });

      const response = await POST(mockRequest, { params: mockParams });

      // Should still succeed
      expect(response.status).toBe(200);

      // Should still update status
      expect(prisma.plaidItem.update).toHaveBeenCalledWith({
        where: { id: mockItemId },
        data: { status: "disconnected" },
      });
    });
  });

  describe("Access Token Retrieval", () => {
    it("should fail if access token not found in Vault", async () => {
      // Mock empty vault result
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([]);

      const mockRequest = new Request(
        "http://localhost/api/plaid/items/item_test123/disconnect",
        {
          method: "POST",
        },
      );
      const mockParams = Promise.resolve({ itemId: mockItemId });

      const response = await POST(mockRequest, { params: mockParams });

      expect(response.status).toBe(500);
      expect(plaidClient.itemRemove).not.toHaveBeenCalled();
      expect(prisma.plaidItem.update).not.toHaveBeenCalled();
    });
  });

  describe("Authorization & Ownership", () => {
    it("should reject unauthorized requests", async () => {
      (auth as jest.Mock).mockResolvedValue({ userId: null });

      const mockRequest = new Request(
        "http://localhost/api/plaid/items/item_test123/disconnect",
        {
          method: "POST",
        },
      );
      const mockParams = Promise.resolve({ itemId: mockItemId });

      const response = await POST(mockRequest, { params: mockParams });

      expect(response.status).toBe(401);
      expect(plaidClient.itemRemove).not.toHaveBeenCalled();
      expect(prisma.plaidItem.update).not.toHaveBeenCalled();
    });

    it("should reject if user profile not found", async () => {
      (prisma.userProfile.findUnique as jest.Mock).mockResolvedValue(null);

      const mockRequest = new Request(
        "http://localhost/api/plaid/items/item_test123/disconnect",
        {
          method: "POST",
        },
      );
      const mockParams = Promise.resolve({ itemId: mockItemId });

      const response = await POST(mockRequest, { params: mockParams });

      expect(response.status).toBe(404);
      expect(plaidClient.itemRemove).not.toHaveBeenCalled();
      expect(prisma.plaidItem.update).not.toHaveBeenCalled();
    });

    it("should reject if item does not belong to user", async () => {
      (prisma.plaidItem.findFirst as jest.Mock).mockResolvedValue(null);

      const mockRequest = new Request(
        "http://localhost/api/plaid/items/item_test123/disconnect",
        {
          method: "POST",
        },
      );
      const mockParams = Promise.resolve({ itemId: mockItemId });

      const response = await POST(mockRequest, { params: mockParams });

      expect(response.status).toBe(404);
      expect(plaidClient.itemRemove).not.toHaveBeenCalled();
      expect(prisma.plaidItem.update).not.toHaveBeenCalled();
    });
  });

  describe("Database Updates", () => {
    it("should update status to disconnected after Plaid call", async () => {
      const mockRequest = new Request(
        "http://localhost/api/plaid/items/item_test123/disconnect",
        {
          method: "POST",
        },
      );
      const mockParams = Promise.resolve({ itemId: mockItemId });

      await POST(mockRequest, { params: mockParams });

      // Verify status update
      expect(prisma.plaidItem.update).toHaveBeenCalledWith({
        where: { id: mockItemId },
        data: {
          status: "disconnected",
        },
      });
    });
  });

  describe("Response Format", () => {
    it("should return success response", async () => {
      const mockRequest = new Request(
        "http://localhost/api/plaid/items/item_test123/disconnect",
        {
          method: "POST",
        },
      );
      const mockParams = Promise.resolve({ itemId: mockItemId });

      const response = await POST(mockRequest, { params: mockParams });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  describe("Error Handling", () => {
    it("should handle database errors gracefully", async () => {
      (prisma.plaidItem.update as jest.Mock).mockRejectedValue(
        new Error("Database connection failed"),
      );

      const mockRequest = new Request(
        "http://localhost/api/plaid/items/item_test123/disconnect",
        {
          method: "POST",
        },
      );
      const mockParams = Promise.resolve({ itemId: mockItemId });

      const response = await POST(mockRequest, { params: mockParams });

      expect(response.status).toBe(500);
    });

    it("should handle missing itemId parameter", async () => {
      const mockRequest = new Request(
        "http://localhost/api/plaid/items//disconnect",
        {
          method: "POST",
        },
      );
      const mockParams = Promise.resolve({ itemId: "" });

      const response = await POST(mockRequest, { params: mockParams });

      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });
});

describe("Integration: Disconnect Workflow", () => {
  it("should complete full disconnect workflow", async () => {
    const mockUserId = "user_integration";
    const mockItemId = "item_integration";
    const mockAccessToken = "access-integration-token";

    (auth as jest.Mock).mockResolvedValue({ userId: mockUserId });
    (prisma.userProfile.findUnique as jest.Mock).mockResolvedValue({
      id: "profile_integration",
      clerkId: mockUserId,
    });
    (prisma.plaidItem.findFirst as jest.Mock).mockResolvedValue({
      id: mockItemId,
      userId: "profile_integration",
      institutionName: "Integration Bank",
      itemId: "plaid_item_integration",
      status: "active",
      accessTokenId: "vault_integration_secret",
    });
    (prisma.$queryRaw as jest.Mock).mockResolvedValue([
      { decrypted_secret: mockAccessToken },
    ]);
    (plaidClient.itemRemove as jest.Mock).mockResolvedValue({
      data: { request_id: "req_integration" },
    });
    (prisma.plaidItem.update as jest.Mock).mockResolvedValue({
      id: mockItemId,
      status: "disconnected",
    });

    const mockRequest = new Request(
      "http://localhost/api/plaid/items/item_integration/disconnect",
      {
        method: "POST",
      },
    );
    const mockParams = Promise.resolve({ itemId: mockItemId });

    const response = await POST(mockRequest, { params: mockParams });
    const data = await response.json();

    // Verify complete workflow
    expect(auth).toHaveBeenCalled();
    expect(prisma.userProfile.findUnique).toHaveBeenCalled();
    expect(prisma.plaidItem.findFirst).toHaveBeenCalled();
    expect(prisma.$queryRaw).toHaveBeenCalled();
    expect(plaidClient.itemRemove).toHaveBeenCalledWith({
      access_token: mockAccessToken,
    });
    expect(prisma.plaidItem.update).toHaveBeenCalled();

    // Verify response
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });
});
