/**
 * Tests for Family Operations
 *
 * @implements BR-003 - Family Member Ownership
 * @implements BR-004 - Family Member Name Requirements
 * @implements BR-005 - Update Validation
 * @implements BR-006 - Primary member cannot be deleted
 * @implements BR-007 - Cascade delete restrictions
 * @satisfies US-003 - Add Family Members
 * @satisfies US-004 - Update Family Member
 * @satisfies US-005 - Delete Family Member
 */

import {
  getUserProfile,
  getFamilyMembers,
  createFamilyMember,
  updateFamilyMember,
  deleteFamilyMember,
  UserNotFoundError,
  FamilyMemberNotFoundError,
  UnauthorizedAccessError,
} from "@/lib/family-operations";
import { prisma } from "@/lib/prisma";

// Mock Prisma
jest.mock("@/lib/prisma", () => ({
  prisma: {
    userProfile: {
      findUnique: jest.fn(),
    },
    familyMember: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

describe("Family Operations", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("getUserProfile", () => {
    it("should return user profile when found", async () => {
      const mockProfile = {
        id: "profile_123",
        clerkId: "user_123",
        name: "Test User",
      };
      (prisma.userProfile.findUnique as jest.Mock).mockResolvedValue(
        mockProfile,
      );

      const result = await getUserProfile("user_123");

      expect(result).toEqual(mockProfile);
      expect(prisma.userProfile.findUnique).toHaveBeenCalledWith({
        where: { clerkId: "user_123" },
      });
    });

    it("should throw UserNotFoundError when profile not found - BR-003", async () => {
      (prisma.userProfile.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(getUserProfile("nonexistent")).rejects.toThrow(
        UserNotFoundError,
      );
      await expect(getUserProfile("nonexistent")).rejects.toThrow(
        "User profile not found for userId: nonexistent",
      );
    });
  });

  describe("getFamilyMembers", () => {
    it("should return all family members for a user - US-003", async () => {
      const mockProfile = { id: "profile_123", clerkId: "user_123" };
      const mockMembers = [
        { id: "member_1", userId: "profile_123", name: "Member 1" },
        { id: "member_2", userId: "profile_123", name: "Member 2" },
      ];

      (prisma.userProfile.findUnique as jest.Mock).mockResolvedValue(
        mockProfile,
      );
      (prisma.familyMember.findMany as jest.Mock).mockResolvedValue(
        mockMembers,
      );

      const result = await getFamilyMembers("user_123");

      expect(result).toEqual(mockMembers);
      expect(prisma.familyMember.findMany).toHaveBeenCalledWith({
        where: { userId: "profile_123" },
        orderBy: { createdAt: "asc" },
      });
    });

    it("should throw error if user profile not found", async () => {
      (prisma.userProfile.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(getFamilyMembers("nonexistent")).rejects.toThrow(
        UserNotFoundError,
      );
    });
  });

  describe("createFamilyMember", () => {
    it("should create a new family member - BR-004, US-003", async () => {
      const mockProfile = { id: "profile_123", clerkId: "user_123" };
      const mockMember = {
        id: "member_123",
        userId: "profile_123",
        name: "New Member",
        email: "member@example.com",
        isPrimary: false,
      };

      (prisma.userProfile.findUnique as jest.Mock).mockResolvedValue(
        mockProfile,
      );
      (prisma.familyMember.create as jest.Mock).mockResolvedValue(mockMember);

      const result = await createFamilyMember("user_123", {
        name: "New Member",
        email: "member@example.com",
      });

      expect(result).toEqual(mockMember);
      expect(prisma.familyMember.create).toHaveBeenCalledWith({
        data: {
          name: "New Member",
          email: "member@example.com",
          userId: "profile_123",
          isPrimary: false,
        },
      });
    });

    it("should set isPrimary to false for new members - BR-003", async () => {
      const mockProfile = { id: "profile_123", clerkId: "user_123" };
      (prisma.userProfile.findUnique as jest.Mock).mockResolvedValue(
        mockProfile,
      );
      (prisma.familyMember.create as jest.Mock).mockResolvedValue({});

      await createFamilyMember("user_123", { name: "Test" });

      expect(prisma.familyMember.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ isPrimary: false }),
        }),
      );
    });
  });

  describe("updateFamilyMember", () => {
    it("should update family member when authorized - BR-005, US-004", async () => {
      const mockProfile = { id: "profile_123", clerkId: "user_123" };
      const mockExistingMember = {
        id: "member_123",
        userId: "profile_123",
        name: "Old Name",
      };
      const mockUpdatedMember = {
        id: "member_123",
        userId: "profile_123",
        name: "New Name",
      };

      (prisma.userProfile.findUnique as jest.Mock).mockResolvedValue(
        mockProfile,
      );
      (prisma.familyMember.findFirst as jest.Mock).mockResolvedValue(
        mockExistingMember,
      );
      (prisma.familyMember.update as jest.Mock).mockResolvedValue(
        mockUpdatedMember,
      );

      const result = await updateFamilyMember("user_123", "member_123", {
        name: "New Name",
      });

      expect(result).toEqual(mockUpdatedMember);
      expect(prisma.familyMember.update).toHaveBeenCalledWith({
        where: { id: "member_123" },
        data: { name: "New Name" },
      });
    });

    it("should verify ownership before updating - BR-003", async () => {
      const mockProfile = { id: "profile_123", clerkId: "user_123" };
      (prisma.userProfile.findUnique as jest.Mock).mockResolvedValue(
        mockProfile,
      );
      (prisma.familyMember.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        updateFamilyMember("user_123", "member_123", { name: "New Name" }),
      ).rejects.toThrow(FamilyMemberNotFoundError);

      expect(prisma.familyMember.findFirst).toHaveBeenCalledWith({
        where: {
          id: "member_123",
          userId: "profile_123",
        },
      });
    });

    it("should throw FamilyMemberNotFoundError if member does not exist", async () => {
      const mockProfile = { id: "profile_123", clerkId: "user_123" };
      (prisma.userProfile.findUnique as jest.Mock).mockResolvedValue(
        mockProfile,
      );
      (prisma.familyMember.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        updateFamilyMember("user_123", "nonexistent", { name: "Test" }),
      ).rejects.toThrow(FamilyMemberNotFoundError);
      await expect(
        updateFamilyMember("user_123", "nonexistent", { name: "Test" }),
      ).rejects.toThrow("Family member not found: nonexistent");
    });
  });

  describe("deleteFamilyMember", () => {
    it("should delete family member when authorized - US-005", async () => {
      const mockProfile = { id: "profile_123", clerkId: "user_123" };
      const mockMember = {
        id: "member_123",
        userId: "profile_123",
        isPrimary: false,
      };

      (prisma.userProfile.findUnique as jest.Mock).mockResolvedValue(
        mockProfile,
      );
      (prisma.familyMember.findFirst as jest.Mock).mockResolvedValue(
        mockMember,
      );
      (prisma.familyMember.delete as jest.Mock).mockResolvedValue(mockMember);

      await deleteFamilyMember("user_123", "member_123");

      expect(prisma.familyMember.delete).toHaveBeenCalledWith({
        where: { id: "member_123" },
      });
    });

    it("should prevent deletion of primary member - BR-006", async () => {
      const mockProfile = { id: "profile_123", clerkId: "user_123" };
      const mockPrimaryMember = {
        id: "member_123",
        userId: "profile_123",
        isPrimary: true,
      };

      (prisma.userProfile.findUnique as jest.Mock).mockResolvedValue(
        mockProfile,
      );
      (prisma.familyMember.findFirst as jest.Mock).mockResolvedValue(
        mockPrimaryMember,
      );

      await expect(
        deleteFamilyMember("user_123", "member_123"),
      ).rejects.toThrow(UnauthorizedAccessError);
      await expect(
        deleteFamilyMember("user_123", "member_123"),
      ).rejects.toThrow("Cannot delete primary family member");

      expect(prisma.familyMember.delete).not.toHaveBeenCalled();
    });

    it("should verify ownership before deleting - BR-003", async () => {
      const mockProfile = { id: "profile_123", clerkId: "user_123" };
      (prisma.userProfile.findUnique as jest.Mock).mockResolvedValue(
        mockProfile,
      );
      (prisma.familyMember.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        deleteFamilyMember("user_123", "member_123"),
      ).rejects.toThrow(FamilyMemberNotFoundError);

      expect(prisma.familyMember.findFirst).toHaveBeenCalledWith({
        where: {
          id: "member_123",
          userId: "profile_123",
        },
      });
    });

    it("should throw FamilyMemberNotFoundError if member does not exist", async () => {
      const mockProfile = { id: "profile_123", clerkId: "user_123" };
      (prisma.userProfile.findUnique as jest.Mock).mockResolvedValue(
        mockProfile,
      );
      (prisma.familyMember.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        deleteFamilyMember("user_123", "nonexistent"),
      ).rejects.toThrow(FamilyMemberNotFoundError);
    });
  });

  describe("Error Types", () => {
    it("should have correct error names", () => {
      const userError = new UserNotFoundError("test_id");
      expect(userError.name).toBe("UserNotFoundError");
      expect(userError.message).toContain("test_id");

      const memberError = new FamilyMemberNotFoundError("member_id");
      expect(memberError.name).toBe("FamilyMemberNotFoundError");
      expect(memberError.message).toContain("member_id");

      const authError = new UnauthorizedAccessError();
      expect(authError.name).toBe("UnauthorizedAccessError");
      expect(authError.message).toBe("Unauthorized access to family member");
    });

    it("should allow custom message for UnauthorizedAccessError", () => {
      const customError = new UnauthorizedAccessError("Custom error message");
      expect(customError.message).toBe("Custom error message");
    });
  });
});
