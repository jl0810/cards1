/**
 * @jest-environment node
 */

import { DELETE } from '@/app/api/user/family/[memberId]/route';
import { prisma } from '@/lib/prisma';

// Mock dependencies
jest.mock('@clerk/nextjs/server');
jest.mock('@/lib/prisma', () => ({
  prisma: {
    userProfile: {
      findUnique: jest.fn(),
    },
    familyMember: {
      findFirst: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

import { auth } from '@clerk/nextjs/server';

/**
 * US-005: Delete Family Member Tests
 * Tests BR-003 (Ownership), BR-006 (Primary Protection), BR-007 (Bank Dependency)
 * 
 * @implements BR-003 - Family member ownership verification
 * @implements BR-006 - Cannot delete primary member
 * @implements BR-007 - Cannot delete member with bank connections
 * @satisfies US-005 - Delete Family Member
 */
describe('US-005: Delete Family Member', () => {
  const mockUserId = 'user_123';
  const mockUserProfile = {
    id: 'profile_123',
    clerkId: mockUserId,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (auth as jest.Mock).mockResolvedValue({ userId: mockUserId });
    (prisma.userProfile.findUnique as jest.Mock).mockResolvedValue(mockUserProfile);
  });

  describe('BR-006: Primary Member Protection', () => {
    it('should prevent deletion of primary family member', async () => {
      const primaryMember = {
        id: 'member_primary',
        userId: mockUserProfile.id,
        name: 'John Doe',
        isPrimary: true,
        _count: { plaidItems: 0 },
      };

      (prisma.familyMember.findFirst as jest.Mock).mockResolvedValue(primaryMember);

      const request = new Request('http://localhost/api/user/family/member_primary', {
        method: 'DELETE',
      });

      const response = await DELETE(request, {
        params: Promise.resolve({ memberId: 'member_primary' }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Cannot delete the primary family member');
      expect(prisma.familyMember.delete).not.toHaveBeenCalled();

      console.log('✅ BR-006: Primary member cannot be deleted');
    });

    it('should allow deletion of non-primary members', async () => {
      const nonPrimaryMember = {
        id: 'member_secondary',
        userId: mockUserProfile.id,
        name: 'Jane Doe',
        isPrimary: false,
        _count: { plaidItems: 0 },
      };

      (prisma.familyMember.findFirst as jest.Mock).mockResolvedValue(nonPrimaryMember);
      (prisma.familyMember.delete as jest.Mock).mockResolvedValue(nonPrimaryMember);

      const request = new Request('http://localhost/api/user/family/member_secondary', {
        method: 'DELETE',
      });

      const response = await DELETE(request, {
        params: Promise.resolve({ memberId: 'member_secondary' }),
      });

      expect(response.status).toBe(204);
      expect(prisma.familyMember.delete).toHaveBeenCalledWith({
        where: { id: 'member_secondary' },
      });

      console.log('✅ BR-006: Non-primary members can be deleted');
    });
  });

  describe('BR-007: Bank Connection Dependency', () => {
    it('should prevent deletion of member with active bank connections', async () => {
      const memberWithBanks = {
        id: 'member_with_banks',
        userId: mockUserProfile.id,
        name: 'Jane Doe',
        isPrimary: false,
        _count: { plaidItems: 2 }, // Has 2 bank connections
      };

      (prisma.familyMember.findFirst as jest.Mock).mockResolvedValue(memberWithBanks);

      const request = new Request('http://localhost/api/user/family/member_with_banks', {
        method: 'DELETE',
      });

      const response = await DELETE(request, {
        params: Promise.resolve({ memberId: 'member_with_banks' }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Cannot delete Jane Doe');
      expect(data.error).toContain('2 active bank connection');
      expect(data.error).toContain('reassign or remove');
      expect(prisma.familyMember.delete).not.toHaveBeenCalled();

      console.log('✅ BR-007: Cannot delete member with bank connections');
    });

    it('should allow deletion when member has no bank connections', async () => {
      const memberWithoutBanks = {
        id: 'member_no_banks',
        userId: mockUserProfile.id,
        name: 'Jane Doe',
        isPrimary: false,
        _count: { plaidItems: 0 }, // No bank connections
      };

      (prisma.familyMember.findFirst as jest.Mock).mockResolvedValue(memberWithoutBanks);
      (prisma.familyMember.delete as jest.Mock).mockResolvedValue(memberWithoutBanks);

      const request = new Request('http://localhost/api/user/family/member_no_banks', {
        method: 'DELETE',
      });

      const response = await DELETE(request, {
        params: Promise.resolve({ memberId: 'member_no_banks' }),
      });

      expect(response.status).toBe(204);
      expect(prisma.familyMember.delete).toHaveBeenCalled();

      console.log('✅ BR-007: Allows deletion when no bank connections');
    });

    it('should provide helpful error message with connection count', async () => {
      const memberWithOneBank = {
        id: 'member_one_bank',
        userId: mockUserProfile.id,
        name: 'Bob Smith',
        isPrimary: false,
        _count: { plaidItems: 1 },
      };

      (prisma.familyMember.findFirst as jest.Mock).mockResolvedValue(memberWithOneBank);

      const request = new Request('http://localhost/api/user/family/member_one_bank', {
        method: 'DELETE',
      });

      const response = await DELETE(request, {
        params: Promise.resolve({ memberId: 'member_one_bank' }),
      });
      const data = await response.json();

      expect(data.error).toContain('Bob Smith');
      expect(data.error).toContain('1 active bank connection');

      console.log('✅ BR-007: Error message includes member name and count');
    });
  });

  describe('BR-003: Family Member Ownership', () => {
    it('should verify ownership before deletion', async () => {
      const request = new Request('http://localhost/api/user/family/member_123', {
        method: 'DELETE',
      });

      await DELETE(request, {
        params: Promise.resolve({ memberId: 'member_123' }),
      });

      // Verify ownership check was performed
      expect(prisma.familyMember.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'member_123',
          userId: mockUserProfile.id,
        },
        include: {
          _count: {
            select: { plaidItems: true },
          },
        },
      });

      console.log('✅ BR-003: Ownership verified before deletion');
    });

    it('should return 404 if member not found or not owned by user', async () => {
      (prisma.familyMember.findFirst as jest.Mock).mockResolvedValue(null);

      const request = new Request('http://localhost/api/user/family/other_user_member', {
        method: 'DELETE',
      });

      const response = await DELETE(request, {
        params: Promise.resolve({ memberId: 'other_user_member' }),
      });

      expect(response.status).toBe(404);
      expect(prisma.familyMember.delete).not.toHaveBeenCalled();

      console.log('✅ BR-003: Returns 404 for non-owned members');
    });
  });

  describe('Integration: Complete Delete Flow', () => {
    it('should successfully delete valid family member', async () => {
      const validMember = {
        id: 'member_valid',
        userId: mockUserProfile.id,
        name: 'Jane Doe',
        isPrimary: false,
        _count: { plaidItems: 0 },
      };

      (prisma.familyMember.findFirst as jest.Mock).mockResolvedValue(validMember);
      (prisma.familyMember.delete as jest.Mock).mockResolvedValue(validMember);

      const request = new Request('http://localhost/api/user/family/member_valid', {
        method: 'DELETE',
      });

      const response = await DELETE(request, {
        params: Promise.resolve({ memberId: 'member_valid' }),
      });

      expect(response.status).toBe(204);
      expect(prisma.familyMember.findFirst).toHaveBeenCalled();
      expect(prisma.familyMember.delete).toHaveBeenCalledWith({
        where: { id: 'member_valid' },
      });

      console.log('✅ US-005: Complete delete flow works');
    });

    it('should enforce all business rules in correct order', async () => {
      // Test that primary check happens before bank connection check
      const primaryWithBanks = {
        id: 'member_primary_banks',
        userId: mockUserProfile.id,
        name: 'John Doe',
        isPrimary: true,
        _count: { plaidItems: 5 },
      };

      (prisma.familyMember.findFirst as jest.Mock).mockResolvedValue(primaryWithBanks);

      const request = new Request('http://localhost/api/user/family/member_primary_banks', {
        method: 'DELETE',
      });

      const response = await DELETE(request, {
        params: Promise.resolve({ memberId: 'member_primary_banks' }),
      });
      const data = await response.json();

      // Should fail on primary check first
      expect(data.error).toContain('primary family member');
      expect(data.error).not.toContain('bank connection');

      console.log('✅ US-005: Business rules enforced in correct order');
    });
  });

  describe('Error Handling', () => {
    it('should return 401 if user not authenticated', async () => {
      (auth as jest.Mock).mockResolvedValue({ userId: null });

      const request = new Request('http://localhost/api/user/family/member_123', {
        method: 'DELETE',
      });

      const response = await DELETE(request, {
        params: Promise.resolve({ memberId: 'member_123' }),
      });

      expect(response.status).toBe(401);

      console.log('✅ Returns 401 for unauthenticated requests');
    });

    it('should return 404 if user profile not found', async () => {
      (prisma.userProfile.findUnique as jest.Mock).mockResolvedValue(null);

      const request = new Request('http://localhost/api/user/family/member_123', {
        method: 'DELETE',
      });

      const response = await DELETE(request, {
        params: Promise.resolve({ memberId: 'member_123' }),
      });

      expect(response.status).toBe(404);

      console.log('✅ Returns 404 if user profile missing');
    });

    it('should return 500 on database error', async () => {
      (prisma.familyMember.findFirst as jest.Mock).mockRejectedValue(new Error('DB error'));

      const request = new Request('http://localhost/api/user/family/member_123', {
        method: 'DELETE',
      });

      const response = await DELETE(request, {
        params: Promise.resolve({ memberId: 'member_123' }),
      });

      expect(response.status).toBe(500);

      console.log('✅ Returns 500 on database error');
    });
  });
});
