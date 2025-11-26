/**
 * @jest-environment node
 */

import { scanAndMatchBenefits } from '@/lib/benefit-matcher';
import { prisma } from '@/lib/prisma';

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  prisma: {
    userProfile: {
      findUnique: jest.fn(),
    },
    plaidAccount: {
      findMany: jest.fn(),
    },
    plaidTransaction: {
      findMany: jest.fn(),
    },
    transactionExtended: {
      upsert: jest.fn(),
    },
  },
}));

// Since the function has complex internal logic, we'll test the observable behavior
// The function is already tested indirectly through transaction sync tests

/**
 * US-012: Manual Benefit Matching Tests
 * Tests BR-024 (Cursor Tracking)
 * 
 * @implements BR-024 - Cursor tracking for benefit matching
 * @satisfies US-012 - Manual Benefit Matching
 */
describe('US-012: Manual Benefit Matching', () => {
  const mockUserId = 'user_123';
  const mockUserProfile = {
    id: 'profile_123',
    clerkId: mockUserId,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    console.log = jest.fn(); // Suppress console logs in tests
  });

  describe('BR-024: Cursor Tracking', () => {
    it('should return zero when no transactions to process', async () => {
      (prisma.userProfile.findUnique as jest.Mock).mockResolvedValue(mockUserProfile);
      (prisma.plaidAccount.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'acc_1',
          accountId: 'plaid_acc_1',
          extended: {
            cardProduct: {
              benefits: [],
            },
          },
        },
      ]);

      (prisma.plaidTransaction.findMany as jest.Mock)
        .mockResolvedValueOnce([]) // No unmatched
        .mockResolvedValueOnce([]); // No extended

      const result = await scanAndMatchBenefits(mockUserId);

      expect(result.matched).toBe(0);
      expect(result.checked).toBe(0);

      console.log('✅ BR-024: Returns zero for no transactions');
    });

    it('should limit scan to 500 transactions per query', async () => {
      (prisma.userProfile.findUnique as jest.Mock).mockResolvedValue(mockUserProfile);
      (prisma.plaidAccount.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'acc_1',
          accountId: 'plaid_acc_1',
          extended: { cardProduct: { benefits: [] } },
        },
      ]);

      (prisma.plaidTransaction.findMany as jest.Mock)
        .mockResolvedValueOnce([]) // Unmatched
        .mockResolvedValueOnce([]); // Extended but unmatched

      await scanAndMatchBenefits(mockUserId);

      // Verify both queries used take: 500
      expect(prisma.plaidTransaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 500 })
      );

      console.log('✅ BR-024: Limits to 500 transactions per query');
    });

    it('should query for both unmatched and extended-but-unmatched transactions', async () => {
      (prisma.userProfile.findUnique as jest.Mock).mockResolvedValue(mockUserProfile);
      (prisma.plaidAccount.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'acc_1',
          accountId: 'plaid_acc_1',
          extended: { cardProduct: { benefits: [] } },
        },
      ]);

      (prisma.plaidTransaction.findMany as jest.Mock)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      await scanAndMatchBenefits(mockUserId);

      // Should query twice - once for unmatched, once for extended-but-unmatched
      expect(prisma.plaidTransaction.findMany).toHaveBeenCalledTimes(2);
      
      // First call: transactions with no extended record
      expect(prisma.plaidTransaction.findMany).toHaveBeenNthCalledWith(1, expect.objectContaining({
        where: expect.objectContaining({
          extended: null,
        }),
      }));

      // Second call: transactions with extended but no match
      expect(prisma.plaidTransaction.findMany).toHaveBeenNthCalledWith(2, expect.objectContaining({
        where: expect.objectContaining({
          extended: {
            matchedBenefitId: null,
          },
        }),
      }));

      console.log('✅ BR-024: Queries both unmatched types');
    });
  });

  describe('Account Filtering', () => {
    it('should scan all user accounts if no specific accounts provided', async () => {
      (prisma.userProfile.findUnique as jest.Mock).mockResolvedValue(mockUserProfile);
      (prisma.plaidAccount.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.plaidTransaction.findMany as jest.Mock).mockResolvedValue([]);

      await scanAndMatchBenefits(mockUserId);

      expect(prisma.plaidAccount.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            plaidItem: { userId: mockUserProfile.id },
          }),
        })
      );

      console.log('✅ Scans all user accounts by default');
    });

    it('should filter to specific accounts if provided', async () => {
      (prisma.userProfile.findUnique as jest.Mock).mockResolvedValue(mockUserProfile);
      (prisma.plaidAccount.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.plaidTransaction.findMany as jest.Mock).mockResolvedValue([]);

      const specificAccounts = ['acc_1', 'acc_2'];
      await scanAndMatchBenefits(mockUserId, specificAccounts);

      expect(prisma.plaidAccount.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            accountId: { in: specificAccounts },
          }),
        })
      );

      console.log('✅ Filters to specific accounts when provided');
    });

    it('should return zero if no accounts found', async () => {
      (prisma.userProfile.findUnique as jest.Mock).mockResolvedValue(mockUserProfile);
      (prisma.plaidAccount.findMany as jest.Mock).mockResolvedValue([]);

      const result = await scanAndMatchBenefits(mockUserId);

      expect(result.matched).toBe(0);
      expect(result.checked).toBe(0);
      expect(prisma.plaidTransaction.findMany).not.toHaveBeenCalled();

      console.log('✅ Returns zero for no accounts');
    });
  });

  describe('Error Handling', () => {
    it('should return zero if user not found', async () => {
      (prisma.userProfile.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await scanAndMatchBenefits('nonexistent_user');

      expect(result.matched).toBe(0);
      expect(result.checked).toBe(0);
      expect(prisma.plaidAccount.findMany).not.toHaveBeenCalled();

      console.log('✅ Returns zero for nonexistent user');
    });
  });

  // Note: Full integration testing of scanAndMatchBenefits is done via transaction sync tests
  // This function is called automatically after transaction sync completes
});
