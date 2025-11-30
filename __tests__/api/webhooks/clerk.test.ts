/**
 * Tests for Clerk Webhook API
 *
 * Tests BR-001 (User Profile Creation) and BR-002 (Welcome Email)
 *
 * @implements BR-001 - User Profile Creation
 * @implements BR-002 - Welcome Email
 * @satisfies US-001 - User Registration
 * @satisfies US-002 - User Profile Management
 */

import { POST } from "@/app/api/webhooks/clerk/route";
import { prisma } from "@/lib/prisma";
import { Webhook } from "svix";
import { NextRequest } from "next/server";

// Mock dependencies
jest.mock("svix", () => ({
  Webhook: jest.fn().mockImplementation(() => ({
    verify: jest.fn(),
  })),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    userProfile: {
      upsert: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

jest.mock("@/lib/logger", () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

describe("US-001 & US-002: User Registration and Profile Management", () => {
  const mockWebhookSecret = "whsec_test_secret";

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.CLERK_WEBHOOK_SECRET = mockWebhookSecret;
  });

  afterEach(() => {
    delete process.env.CLERK_WEBHOOK_SECRET;
  });

  describe("Webhook Signature Verification", () => {
    it("should reject requests without signature headers", async () => {
      const mockRequest = new Request("http://localhost/api/webhooks/clerk", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ type: "user.created" }),
      });

      const response = await POST(mockRequest as NextRequest);

      expect(response.status).toBe(400);
    });

    it("should reject invalid webhook signatures", async () => {
      const MockWebhook = Webhook as jest.MockedClass<typeof Webhook>;
      MockWebhook.mockImplementationOnce(
        () =>
          ({
            verify: jest.fn().mockImplementation(() => {
              throw new Error("Invalid signature");
            }),
          }) as unknown as Webhook,
      );

      const mockRequest = new Request("http://localhost/api/webhooks/clerk", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "svix-id": "msg_test",
          "svix-timestamp": "1234567890",
          "svix-signature": "invalid_signature",
        },
        body: JSON.stringify({ type: "user.created" }),
      });

      const response = await POST(mockRequest as NextRequest);

      expect(response.status).toBe(400);
    });
  });

  describe("BR-001: User Profile Creation", () => {
    it("should create user profile on user.created event", async () => {
      const mockPayload = {
        type: "user.created",
        data: {
          id: "user_test123",
          email_addresses: [{ email_address: "test@example.com" }],
          first_name: "Test",
          last_name: "User",
          image_url: "https://example.com/avatar.png",
        },
      };

      const MockWebhook = Webhook as jest.MockedClass<typeof Webhook>;
      MockWebhook.mockImplementationOnce(
        () =>
          ({
            verify: jest.fn().mockReturnValue(mockPayload),
          }) as unknown as Webhook,
      );

      (prisma.userProfile.upsert as jest.Mock).mockResolvedValue({
        id: "profile_test",
        clerkId: "user_test123",
      });

      const mockRequest = new Request("http://localhost/api/webhooks/clerk", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "svix-id": "msg_test",
          "svix-timestamp": "1234567890",
          "svix-signature": "valid_signature",
        },
        body: JSON.stringify(mockPayload),
      });

      const response = await POST(mockRequest as NextRequest);

      expect(response.status).toBe(200);
      expect(prisma.userProfile.upsert).toHaveBeenCalled();
    });
  });

  describe("User Profile Updates", () => {
    it("should update user profile on user.updated event", async () => {
      const mockPayload = {
        type: "user.updated",
        data: {
          id: "user_test123",
          email_addresses: [{ email_address: "updated@example.com" }],
          first_name: "Updated",
          last_name: "User",
          image_url: "https://example.com/new-avatar.png",
        },
      };

      const MockWebhook = Webhook as jest.MockedClass<typeof Webhook>;
      MockWebhook.mockImplementationOnce(
        () =>
          ({
            verify: jest.fn().mockReturnValue(mockPayload),
          }) as unknown as Webhook,
      );

      (prisma.userProfile.upsert as jest.Mock).mockResolvedValue({
        id: "profile_test",
        clerkId: "user_test123",
      });

      const mockRequest = new Request("http://localhost/api/webhooks/clerk", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "svix-id": "msg_test",
          "svix-timestamp": "1234567890",
          "svix-signature": "valid_signature",
        },
        body: JSON.stringify(mockPayload),
      });

      const response = await POST(mockRequest as NextRequest);

      expect(response.status).toBe(200);
    });
  });

  describe("User Deletion", () => {
    it("should handle user.deleted event", async () => {
      const mockPayload = {
        type: "user.deleted",
        data: {
          id: "user_test123",
        },
      };

      const MockWebhook = Webhook as jest.MockedClass<typeof Webhook>;
      MockWebhook.mockImplementationOnce(
        () =>
          ({
            verify: jest.fn().mockReturnValue(mockPayload),
          }) as unknown as Webhook,
      );

      const mockRequest = new Request("http://localhost/api/webhooks/clerk", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "svix-id": "msg_test",
          "svix-timestamp": "1234567890",
          "svix-signature": "valid_signature",
        },
        body: JSON.stringify(mockPayload),
      });

      const response = await POST(mockRequest as NextRequest);

      expect(response.status).toBe(200);
    });
  });

  describe("Error Handling", () => {
    it("should handle database errors gracefully", async () => {
      const mockPayload = {
        type: "user.created",
        data: {
          id: "user_test123",
        },
      };

      const MockWebhook = Webhook as jest.MockedClass<typeof Webhook>;
      MockWebhook.mockImplementationOnce(
        () =>
          ({
            verify: jest.fn().mockReturnValue(mockPayload),
          }) as unknown as Webhook,
      );

      (prisma.userProfile.upsert as jest.Mock).mockRejectedValue(
        new Error("Database error"),
      );

      const mockRequest = new Request("http://localhost/api/webhooks/clerk", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "svix-id": "msg_test",
          "svix-timestamp": "1234567890",
          "svix-signature": "valid_signature",
        },
        body: JSON.stringify(mockPayload),
      });

      const response = await POST(mockRequest as NextRequest);

      expect(response.status).toBe(500);
    });
  });
});
