/**
 * Tests for Plaid Link Token Creation API
 *
 * Tests BR-008 (Duplicate Detection preparation) for US-006
 *
 * @implements BR-008 - Duplicate Detection
 * @satisfies US-006 - Link Bank Account
 */

import { POST } from "@/app/api/plaid/create-link-token/route";
import { prisma } from "@/lib/prisma";
import { auth, currentUser } from "@clerk/nextjs/server";
import { plaidClient } from "@/lib/plaid";

// Mock dependencies
jest.mock("@clerk/nextjs/server", () => ({
  auth: jest.fn(),
  currentUser: jest.fn(),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    userProfile: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  },
}));

jest.mock("@/lib/plaid", () => ({
  plaidClient: {
    linkTokenCreate: jest.fn(),
  },
}));

jest.mock("@/lib/rate-limit", () => ({
  rateLimit: jest.fn().mockResolvedValue(false),
  RATE_LIMITS: {
    auth: { max: 10, window: "1 m" },
  },
}));

describe("US-006: Link Bank Account - Create Link Token", () => {
  const mockUserId = "user_test123";
  const mockLinkToken = "link-sandbox-test-token";

  beforeEach(() => {
    jest.clearAllMocks();

    (auth as unknown as jest.Mock).mockResolvedValue({ userId: mockUserId });
    (currentUser as jest.Mock).mockResolvedValue({
      id: mockUserId,
      firstName: "Test",
      imageUrl: "https://example.com/avatar.png",
    });

    (prisma.userProfile.findUnique as jest.Mock).mockResolvedValue({
      id: "profile_test123",
      clerkId: mockUserId,
    });

    (plaidClient.linkTokenCreate as jest.Mock).mockResolvedValue({
      data: {
        link_token: mockLinkToken,
        expiration: "2025-01-01T00:00:00Z",
      },
    });
  });

  describe("Authorization", () => {
    it("should reject unauthorized requests", async () => {
      (auth as unknown as jest.Mock).mockResolvedValue({ userId: null });
      (currentUser as jest.Mock).mockResolvedValue(null);

      const mockRequest = new Request(
        "http://localhost/api/plaid/create-link-token",
        {
          method: "POST",
        },
      );
      const response = await POST(mockRequest);

      expect(response.status).toBe(401);
      expect(plaidClient.linkTokenCreate).not.toHaveBeenCalled();
    });
  });

  describe("Link Token Creation", () => {
    it("should create link token for authenticated user", async () => {
      const mockRequest = new Request(
        "http://localhost/api/plaid/create-link-token",
        {
          method: "POST",
        },
      );
      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.link_token).toBe(mockLinkToken);
      expect(plaidClient.linkTokenCreate).toHaveBeenCalled();
    });

    it("should include correct Plaid products", async () => {
      const mockRequest = new Request(
        "http://localhost/api/plaid/create-link-token",
        {
          method: "POST",
        },
      );
      await POST(mockRequest);

      const callArgs = (plaidClient.linkTokenCreate as jest.Mock).mock
        .calls[0][0];
      expect(callArgs.products).toContain("transactions");
    });

    it("should set correct user client ID", async () => {
      const mockRequest = new Request(
        "http://localhost/api/plaid/create-link-token",
        {
          method: "POST",
        },
      );
      await POST(mockRequest);

      const callArgs = (plaidClient.linkTokenCreate as jest.Mock).mock
        .calls[0][0];
      expect(callArgs.user.client_user_id).toBe(mockUserId);
    });
  });

  describe("User Profile Creation", () => {
    it("should create profile if not exists", async () => {
      (prisma.userProfile.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.userProfile.create as jest.Mock).mockResolvedValue({
        id: "new_profile",
        clerkId: mockUserId,
      });

      const mockRequest = new Request(
        "http://localhost/api/plaid/create-link-token",
        {
          method: "POST",
        },
      );
      await POST(mockRequest);

      expect(prisma.userProfile.create).toHaveBeenCalled();
    });
  });

  describe("Error Handling", () => {
    it("should handle Plaid API errors", async () => {
      (plaidClient.linkTokenCreate as jest.Mock).mockRejectedValue(
        new Error("Plaid API error"),
      );

      const mockRequest = new Request(
        "http://localhost/api/plaid/create-link-token",
        {
          method: "POST",
        },
      );
      const response = await POST(mockRequest);

      expect(response.status).toBe(500);
    });
  });

  describe("Rate Limiting", () => {
    it("should respect rate limits", async () => {
      const { rateLimit } = require("@/lib/rate-limit");
      rateLimit.mockResolvedValueOnce(true);

      const mockRequest = new Request(
        "http://localhost/api/plaid/create-link-token",
        {
          method: "POST",
        },
      );
      const response = await POST(mockRequest);

      expect(response.status).toBe(429);
    });
  });
});
