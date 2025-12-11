/**
 * Tests for Family API routes
 *
 * @implements BR-003 - Family Member Ownership
 * @satisfies US-003 - Add Family Members
 */

import { GET, POST } from "@/app/api/user/family/route";
import { getFamilyMembers, createFamilyMember } from "@/lib/family-operations";
import { auth } from "@clerk/nextjs/server";
import { createMockRequest } from "../../utils/mock-helpers";

jest.mock("@/lib/family-operations", () => ({
  getFamilyMembers: jest.fn(),
  createFamilyMember: jest.fn(),
  UserNotFoundError: class UserNotFoundError extends Error {},
  FamilyMemberNotFoundError: class FamilyMemberNotFoundError extends Error {},
  UnauthorizedAccessError: class UnauthorizedAccessError extends Error {},
}));

jest.mock("@clerk/nextjs/server", () => ({
  auth: jest.fn(),
}));

jest.mock("@/lib/rate-limit", () => ({
  rateLimit: jest.fn().mockResolvedValue(false), // Not rate limited
  RATE_LIMITS: { write: 20 },
}));

describe("Family API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (auth as unknown as jest.Mock).mockReturnValue({ userId: "user_123" });
  });

  describe("GET", () => {
    it("should return family members", async () => {
      const mockMembers = [{ id: "1", name: "Member 1" }];
      (getFamilyMembers as jest.Mock).mockResolvedValue(mockMembers);

      const req = createMockRequest({
        method: "GET",
        url: "http://localhost/api/user/family",
      });
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data).toEqual(mockMembers);
      expect(getFamilyMembers).toHaveBeenCalledWith("user_123");
    });

    it("should return 401 if not authenticated", async () => {
      (auth as unknown as jest.Mock).mockReturnValue({ userId: null });

      const req = createMockRequest({
        method: "GET",
        url: "http://localhost/api/user/family",
      });
      const res = await GET(req);

      expect(res.status).toBe(401);
    });

    it("should return 500 on error", async () => {
      (getFamilyMembers as jest.Mock).mockRejectedValue(
        new Error("Test error"),
      );

      const req = createMockRequest({
        method: "GET",
        url: "http://localhost/api/user/family",
      });
      const res = await GET(req);

      expect(res.status).toBe(500);
    });
  });

  describe("POST", () => {
    it("should create family member", async () => {
      const mockMember = { id: "1", name: "New Member" };
      (createFamilyMember as jest.Mock).mockResolvedValue(mockMember);

      const req = createMockRequest({
        method: "POST",
        url: "http://localhost/api/user/family",
        body: { name: "New Member", email: "test@example.com" },
      });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(201);
      expect(data).toEqual(mockMember);
      expect(createFamilyMember).toHaveBeenCalledWith("user_123", {
        name: "New Member",
        email: "test@example.com",
        role: "Member",
      });
    });

    it("should return 400 for invalid input", async () => {
      const req = createMockRequest({
        method: "POST",
        url: "http://localhost/api/user/family",
        body: { email: "invalid" }, // Missing name
      });
      const res = await POST(req);

      expect(res.status).toBe(400);
      expect(createFamilyMember).not.toHaveBeenCalled();
    });

    it("should return 401 if not authenticated", async () => {
      (auth as unknown as jest.Mock).mockReturnValue({ userId: null });

      const req = createMockRequest({
        method: "POST",
        url: "http://localhost/api/user/family",
        body: { name: "Test" },
      });
      const res = await POST(req);

      expect(res.status).toBe(401);
    });
  });
});
