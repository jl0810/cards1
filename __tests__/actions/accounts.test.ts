/**
 * Tests for Account Actions
 *
 * @satisfies US-031 - Customize Account Display Names
 */

import { updateAccountNickname } from "@/app/actions/accounts";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";

// Mock dependencies
jest.mock("@clerk/nextjs/server");
jest.mock("@/lib/prisma", () => ({
  prisma: {
    userProfile: {
      findUnique: jest.fn(),
    },
    plaidAccount: {
      findFirst: jest.fn(),
    },
    accountExtended: {
      upsert: jest.fn(),
    },
  },
}));
jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}));

describe("updateAccountNickname", () => {
  const mockUserId = "user_123";
  const mockUserProfile = { id: "profile_123", clerkId: mockUserId };
  const mockAccount = {
    id: "account_123",
    familyMember: { userId: "profile_123" },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(auth).mockResolvedValue({ userId: mockUserId } as any);
  });

  it("should update account nickname successfully", async () => {
    (prisma.userProfile.findUnique as jest.Mock).mockResolvedValue(
      mockUserProfile,
    );
    (prisma.plaidAccount.findFirst as jest.Mock).mockResolvedValue(mockAccount);
    (prisma.accountExtended.upsert as jest.Mock).mockResolvedValue({
      id: "extended_123",
      plaidAccountId: "account_123",
      nickname: "My Favorite Card",
    });

    const result = await updateAccountNickname({
      accountId: "account_123",
      nickname: "My Favorite Card",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.nickname).toBe("My Favorite Card");
    }
    expect(prisma.accountExtended.upsert).toHaveBeenCalledWith({
      where: { plaidAccountId: "account_123" },
      create: {
        plaidAccountId: "account_123",
        nickname: "My Favorite Card",
      },
      update: {
        nickname: "My Favorite Card",
      },
    });
  });

  it("should clear nickname when null is provided", async () => {
    (prisma.userProfile.findUnique as jest.Mock).mockResolvedValue(
      mockUserProfile,
    );
    (prisma.plaidAccount.findFirst as jest.Mock).mockResolvedValue(mockAccount);
    (prisma.accountExtended.upsert as jest.Mock).mockResolvedValue({
      id: "extended_123",
      plaidAccountId: "account_123",
      nickname: null,
    });

    const result = await updateAccountNickname({
      accountId: "account_123",
      nickname: null,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.nickname).toBeNull();
    }
  });

  it("should reject unauthorized requests", async () => {
    jest.mocked(auth).mockResolvedValue({ userId: null } as any);

    const result = await updateAccountNickname({
      accountId: "account_123",
      nickname: "Test",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Unauthorized");
    }
  });

  it("should reject if account not found", async () => {
    (prisma.userProfile.findUnique as jest.Mock).mockResolvedValue(
      mockUserProfile,
    );
    (prisma.plaidAccount.findFirst as jest.Mock).mockResolvedValue(null);

    const result = await updateAccountNickname({
      accountId: "account_123",
      nickname: "Test",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Account not found");
    }
  });

  it("should validate nickname length", async () => {
    const longNickname = "a".repeat(101);

    const result = await updateAccountNickname({
      accountId: "account_123",
      nickname: longNickname,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Validation failed");
    }
  });

  it("should reject if user does not own account", async () => {
    (prisma.userProfile.findUnique as jest.Mock).mockResolvedValue(
      mockUserProfile,
    );
    (prisma.plaidAccount.findFirst as jest.Mock).mockResolvedValue(null);

    const result = await updateAccountNickname({
      accountId: "account_123",
      nickname: "Test",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Account not found");
    }
  });

  it("should allow reverting nickname by setting it to null", async () => {
    (prisma.userProfile.findUnique as jest.Mock).mockResolvedValue(
      mockUserProfile,
    );
    (prisma.plaidAccount.findFirst as jest.Mock).mockResolvedValue(mockAccount);
    (prisma.accountExtended.upsert as jest.Mock).mockResolvedValue({
      id: "extended_123",
      plaidAccountId: "account_123",
      nickname: null,
    });

    const result = await updateAccountNickname({
      accountId: "account_123",
      nickname: null,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.nickname).toBeNull();
    }
    expect(prisma.accountExtended.upsert).toHaveBeenCalledWith({
      where: { plaidAccountId: "account_123" },
      create: {
        plaidAccountId: "account_123",
        nickname: null,
      },
      update: {
        nickname: null,
      },
    });
  });
});
