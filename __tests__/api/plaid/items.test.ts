/**
 * Tests for Plaid Items List API
 *
 * Tests BR-014 (Account Balance Display) and BR-015 (Due Date Calculation)
 *
 * @implements BR-014 - Account Balance Display
 * @implements BR-015 - Due Date Calculation
 * @satisfies US-008 - View Connected Accounts
 */

import { GET } from "@/app/api/plaid/items/route";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";

// Mock dependencies
jest.mock("@clerk/nextjs/server", () => ({
  auth: jest.fn(),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    userProfile: {
      findUnique: jest.fn(),
    },
    plaidItem: {
      findMany: jest.fn(),
    },
  },
}));

// Mock rate limiting
jest.mock("@/lib/rate-limit", () => ({
  rateLimit: jest.fn().mockResolvedValue(false),
  RATE_LIMITS: {
    default: { max: 60, window: "1 m" },
  },
}));

describe("US-008: View Connected Accounts", () => {
  const mockUserId = "user_test123";
  const mockUserProfileId = "profile_test123";

  beforeEach(() => {
    jest.clearAllMocks();
    (auth as unknown as jest.Mock).mockResolvedValue({ userId: mockUserId });
    (prisma.userProfile.findUnique as jest.Mock).mockResolvedValue({
      id: mockUserProfileId,
      clerkId: mockUserId,
    });
  });

  describe("Authorization", () => {
    it("should reject unauthorized requests", async () => {
      (auth as unknown as jest.Mock).mockResolvedValue({ userId: null });

      const mockRequest = new Request("http://localhost/api/plaid/items");
      const response = await GET(mockRequest);

      expect(response.status).toBe(401);
    });

    it("should reject if user profile not found", async () => {
      (prisma.userProfile.findUnique as jest.Mock).mockResolvedValue(null);

      const mockRequest = new Request("http://localhost/api/plaid/items");
      const response = await GET(mockRequest);

      expect(response.status).toBe(404);
    });
  });

  describe("BR-014: Account Balance Display", () => {
    it("should return items with account balances", async () => {
      const mockItems = [
        {
          id: "item_1",
          institutionName: "Test Bank",
          accounts: [
            {
              id: "acc_1",
              name: "Credit Card",
              currentBalance: 1500.0,
              limit: 5000,
            },
          ],
        },
      ];

      (prisma.plaidItem.findMany as jest.Mock).mockResolvedValue(mockItems);

      const mockRequest = new Request("http://localhost/api/plaid/items");
      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveLength(1);
      expect(data[0].accounts[0].currentBalance).toBe(1500.0);
    });
  });

  describe("BR-015: Due Date Calculation", () => {
    it("should include due date information in accounts", async () => {
      const mockItems = [
        {
          id: "item_1",
          institutionName: "Test Bank",
          accounts: [
            {
              id: "acc_1",
              name: "Credit Card",
              nextPaymentDueDate: new Date("2025-12-15"),
            },
          ],
        },
      ];

      (prisma.plaidItem.findMany as jest.Mock).mockResolvedValue(mockItems);

      const mockRequest = new Request("http://localhost/api/plaid/items");
      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data[0].accounts[0].nextPaymentDueDate).toBeDefined();
    });
  });

  describe("Response Format", () => {
    it("should return empty array when no items exist", async () => {
      (prisma.plaidItem.findMany as jest.Mock).mockResolvedValue([]);

      const mockRequest = new Request("http://localhost/api/plaid/items");
      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual([]);
    });
  });

  describe("Error Handling", () => {
    it("should handle database errors gracefully", async () => {
      (prisma.plaidItem.findMany as jest.Mock).mockRejectedValue(
        new Error("Database error"),
      );

      const mockRequest = new Request("http://localhost/api/plaid/items");
      const response = await GET(mockRequest);

      expect(response.status).toBe(500);
    });
  });
});
