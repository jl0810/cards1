/**
 * @jest-environment node
 */

import { GET } from '@/app/api/benefits/usage/route';
import { prisma } from '@/lib/prisma';

// Mock dependencies
jest.mock('@clerk/nextjs/server');
jest.mock('@/lib/prisma', () => ({
  prisma: {
    userProfile: {
      findUnique: jest.fn(),
    },
    plaidAccount: {
      findMany: jest.fn(),
    },
    benefitUsage: {
      findMany: jest.fn(),
    },
  },
}));

import { auth } from '@clerk/nextjs/server';

/**
 * US-011: View Benefit Usage Tests
 * Tests BR-021 (Period Calculation), BR-022 (Usage %), BR-023 (Urgency Sorting)
 * 
 * @implements BR-021 - Benefit period calculation (monthly/quarterly/annual)
 * @implements BR-022 - Usage percentage calculation
 * @implements BR-023 - Urgency-based sorting
 * @satisfies US-011 - View Benefit Usage
 */
describe('US-011: View Benefit Usage', () => {
  const mockUserId = 'user_123';
  const mockUserProfile = {
    id: 'profile_123',
    clerkId: mockUserId,
  };

  const mockCardProduct = {
    id: 'product_1',
    productName: 'Chase Sapphire Reserve',
    issuer: 'Chase',
  };

  const mockBenefit = {
    id: 'benefit_1',
    benefitName: '$300 Travel Credit',
    type: 'Travel Credit',
    timing: 'Annually',
    maxAmount: 300,
    active: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (auth as jest.Mock).mockResolvedValue({ userId: mockUserId });
    (prisma.userProfile.findUnique as jest.Mock).mockResolvedValue(mockUserProfile);
  });

  describe('BR-021: Benefit Period Calculation', () => {
    it('should calculate monthly period correctly', async () => {
      (prisma.plaidAccount.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.benefitUsage.findMany as jest.Mock).mockResolvedValue([]);

      const request = new Request('http://localhost/api/benefits/usage?period=month');
      const response = await GET(request);
      const data = await response.json();

      const now = new Date();
      const expectedStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const expectedEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      expect(data.period).toBe('month');
      expect(new Date(data.periodStart)).toEqual(expectedStart);
      expect(new Date(data.periodEnd)).toEqual(expectedEnd);

      console.log('✅ BR-021: Monthly period calculated correctly');
    });

    it('should calculate quarterly period correctly', async () => {
      (prisma.plaidAccount.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.benefitUsage.findMany as jest.Mock).mockResolvedValue([]);

      const request = new Request('http://localhost/api/benefits/usage?period=quarter');
      const response = await GET(request);
      const data = await response.json();

      const now = new Date();
      const quarter = Math.floor(now.getMonth() / 3);
      const expectedStart = new Date(now.getFullYear(), quarter * 3, 1);
      const expectedEnd = new Date(now.getFullYear(), (quarter + 1) * 3, 0);

      expect(data.period).toBe('quarter');
      expect(new Date(data.periodStart)).toEqual(expectedStart);
      expect(new Date(data.periodEnd)).toEqual(expectedEnd);

      console.log('✅ BR-021: Quarterly period calculated correctly');
    });

    it('should calculate annual period correctly', async () => {
      (prisma.plaidAccount.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.benefitUsage.findMany as jest.Mock).mockResolvedValue([]);

      const request = new Request('http://localhost/api/benefits/usage?period=year');
      const response = await GET(request);
      const data = await response.json();

      const now = new Date();
      const expectedStart = new Date(now.getFullYear(), 0, 1);
      const expectedEnd = new Date(now.getFullYear(), 11, 31);

      expect(data.period).toBe('year');
      expect(new Date(data.periodStart)).toEqual(expectedStart);
      expect(new Date(data.periodEnd)).toEqual(expectedEnd);

      console.log('✅ BR-021: Annual period calculated correctly');
    });

    it('should default to monthly period if not specified', async () => {
      (prisma.plaidAccount.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.benefitUsage.findMany as jest.Mock).mockResolvedValue([]);

      const request = new Request('http://localhost/api/benefits/usage');
      const response = await GET(request);
      const data = await response.json();

      expect(data.period).toBe('month');

      console.log('✅ BR-021: Defaults to monthly period');
    });
  });

  describe('BR-022: Usage Percentage Calculation', () => {
    it('should calculate usage percentage correctly', async () => {
      const mockAccount = {
        id: 'account_1',
        extended: {
          cardProduct: {
            ...mockCardProduct,
            benefits: [mockBenefit],
          },
        },
      };

      const mockUsage = {
        id: 'usage_1',
        cardBenefitId: 'benefit_1',
        usedAmount: 150, // 50% of $300
        periodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        transactionExtensions: [],
      };

      (prisma.plaidAccount.findMany as jest.Mock).mockResolvedValue([mockAccount]);
      (prisma.benefitUsage.findMany as jest.Mock).mockResolvedValue([mockUsage]);

      const request = new Request('http://localhost/api/benefits/usage');
      const response = await GET(request);
      const data = await response.json();

      const benefit = data.benefits[0];
      expect(benefit.maxAmount).toBe(300);
      expect(benefit.usedAmount).toBe(150);
      expect(benefit.percentage).toBe(50); // 150/300 * 100
      expect(benefit.remainingAmount).toBe(150);

      console.log('✅ BR-022: Usage percentage calculated (50%)');
    });

    it('should handle 0% usage', async () => {
      const mockAccount = {
        id: 'account_1',
        extended: {
          cardProduct: {
            ...mockCardProduct,
            benefits: [mockBenefit],
          },
        },
      };

      (prisma.plaidAccount.findMany as jest.Mock).mockResolvedValue([mockAccount]);
      (prisma.benefitUsage.findMany as jest.Mock).mockResolvedValue([]); // No usage

      const request = new Request('http://localhost/api/benefits/usage');
      const response = await GET(request);
      const data = await response.json();

      const benefit = data.benefits[0];
      expect(benefit.usedAmount).toBe(0);
      expect(benefit.percentage).toBe(0);
      expect(benefit.remainingAmount).toBe(300);

      console.log('✅ BR-022: Handles 0% usage');
    });

    it('should handle 100% usage', async () => {
      const mockAccount = {
        id: 'account_1',
        extended: {
          cardProduct: {
            ...mockCardProduct,
            benefits: [mockBenefit],
          },
        },
      };

      const mockUsage = {
        id: 'usage_1',
        cardBenefitId: 'benefit_1',
        usedAmount: 300, // 100% of $300
        periodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        transactionExtensions: [],
      };

      (prisma.plaidAccount.findMany as jest.Mock).mockResolvedValue([mockAccount]);
      (prisma.benefitUsage.findMany as jest.Mock).mockResolvedValue([mockUsage]);

      const request = new Request('http://localhost/api/benefits/usage');
      const response = await GET(request);
      const data = await response.json();

      const benefit = data.benefits[0];
      expect(benefit.usedAmount).toBe(300);
      expect(benefit.percentage).toBe(100);
      expect(benefit.remainingAmount).toBe(0);

      console.log('✅ BR-022: Handles 100% usage');
    });

    it('should not allow negative remaining amount', async () => {
      const mockAccount = {
        id: 'account_1',
        extended: {
          cardProduct: {
            ...mockCardProduct,
            benefits: [mockBenefit],
          },
        },
      };

      const mockUsage = {
        id: 'usage_1',
        cardBenefitId: 'benefit_1',
        usedAmount: 350, // Over limit
        periodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        transactionExtensions: [],
      };

      (prisma.plaidAccount.findMany as jest.Mock).mockResolvedValue([mockAccount]);
      (prisma.benefitUsage.findMany as jest.Mock).mockResolvedValue([mockUsage]);

      const request = new Request('http://localhost/api/benefits/usage');
      const response = await GET(request);
      const data = await response.json();

      const benefit = data.benefits[0];
      expect(benefit.remainingAmount).toBe(0); // Should be 0, not negative

      console.log('✅ BR-022: Prevents negative remaining amount');
    });
  });

  describe('BR-023: Urgency-Based Sorting', () => {
    it('should sort benefits by days remaining (ascending)', async () => {
      const benefit1 = { ...mockBenefit, id: 'benefit_1', benefitName: 'Benefit 1' };
      const benefit2 = { ...mockBenefit, id: 'benefit_2', benefitName: 'Benefit 2' };

      const mockAccount = {
        id: 'account_1',
        extended: {
          cardProduct: {
            ...mockCardProduct,
            benefits: [benefit1, benefit2],
          },
        },
      };

      const now = Date.now();
      const mockUsages = [
        {
          id: 'usage_1',
          cardBenefitId: 'benefit_1',
          usedAmount: 100,
          periodEnd: new Date(now + 5 * 24 * 60 * 60 * 1000), // 5 days
          transactionExtensions: [],
        },
        {
          id: 'usage_2',
          cardBenefitId: 'benefit_2',
          usedAmount: 100,
          periodEnd: new Date(now + 30 * 24 * 60 * 60 * 1000), // 30 days
          transactionExtensions: [],
        },
      ];

      (prisma.plaidAccount.findMany as jest.Mock).mockResolvedValue([mockAccount]);
      (prisma.benefitUsage.findMany as jest.Mock).mockImplementation(({ where }) => {
        return Promise.resolve(
          mockUsages.filter(u => u.cardBenefitId === where.cardBenefitId)
        );
      });

      const request = new Request('http://localhost/api/benefits/usage');
      const response = await GET(request);
      const data = await response.json();

      // Benefit with fewer days remaining should be first (more urgent)
      expect(data.benefits[0].benefitName).toBe('Benefit 1');
      expect(data.benefits[0].daysRemaining).toBeLessThan(data.benefits[1].daysRemaining);

      console.log('✅ BR-023: Sorts by urgency (days remaining)');
    });

    it('should place completed benefits at the end', async () => {
      const benefit1 = { ...mockBenefit, id: 'benefit_1', benefitName: 'Completed' };
      const benefit2 = { ...mockBenefit, id: 'benefit_2', benefitName: 'In Progress' };

      const mockAccount = {
        id: 'account_1',
        extended: {
          cardProduct: {
            ...mockCardProduct,
            benefits: [benefit1, benefit2],
          },
        },
      };

      const now = Date.now();
      const mockUsages = [
        {
          id: 'usage_1',
          cardBenefitId: 'benefit_1',
          usedAmount: 300, // 100% used
          periodEnd: new Date(now + 30 * 24 * 60 * 60 * 1000),
          transactionExtensions: [],
        },
        {
          id: 'usage_2',
          cardBenefitId: 'benefit_2',
          usedAmount: 100, // 33% used
          periodEnd: new Date(now + 30 * 24 * 60 * 60 * 1000),
          transactionExtensions: [],
        },
      ];

      (prisma.plaidAccount.findMany as jest.Mock).mockResolvedValue([mockAccount]);
      (prisma.benefitUsage.findMany as jest.Mock).mockImplementation(({ where }) => {
        return Promise.resolve(
          mockUsages.filter(u => u.cardBenefitId === where.cardBenefitId)
        );
      });

      const request = new Request('http://localhost/api/benefits/usage');
      const response = await GET(request);
      const data = await response.json();

      // Incomplete benefit should be first
      expect(data.benefits[0].benefitName).toBe('In Progress');
      expect(data.benefits[0].remainingAmount).toBeGreaterThan(0);
      
      // Completed benefit should be last
      expect(data.benefits[1].benefitName).toBe('Completed');
      expect(data.benefits[1].remainingAmount).toBe(0);

      console.log('✅ BR-023: Completed benefits sorted to end');
    });

    it('should sort by remaining amount when days are equal', async () => {
      const benefit1 = { ...mockBenefit, id: 'benefit_1', benefitName: 'Higher Remaining', maxAmount: 500 };
      const benefit2 = { ...mockBenefit, id: 'benefit_2', benefitName: 'Lower Remaining', maxAmount: 300 };

      const mockAccount = {
        id: 'account_1',
        extended: {
          cardProduct: {
            ...mockCardProduct,
            benefits: [benefit1, benefit2],
          },
        },
      };

      const now = Date.now();
      const samePeriodEnd = new Date(now + 30 * 24 * 60 * 60 * 1000);
      
      const mockUsages = [
        {
          id: 'usage_1',
          cardBenefitId: 'benefit_1',
          usedAmount: 100, // $400 remaining
          periodEnd: samePeriodEnd,
          transactionExtensions: [],
        },
        {
          id: 'usage_2',
          cardBenefitId: 'benefit_2',
          usedAmount: 100, // $200 remaining
          periodEnd: samePeriodEnd,
          transactionExtensions: [],
        },
      ];

      (prisma.plaidAccount.findMany as jest.Mock).mockResolvedValue([mockAccount]);
      (prisma.benefitUsage.findMany as jest.Mock).mockImplementation(({ where }) => {
        return Promise.resolve(
          mockUsages.filter(u => u.cardBenefitId === where.cardBenefitId)
        );
      });

      const request = new Request('http://localhost/api/benefits/usage');
      const response = await GET(request);
      const data = await response.json();

      // Higher remaining amount should be first (more urgent to use)
      expect(data.benefits[0].benefitName).toBe('Higher Remaining');
      expect(data.benefits[0].remainingAmount).toBeGreaterThan(data.benefits[1].remainingAmount);

      console.log('✅ BR-023: Sorts by remaining amount when days equal');
    });
  });

  describe('Integration: Complete Flow', () => {
    it('should return complete benefit usage data', async () => {
      const mockAccount = {
        id: 'account_1',
        extended: {
          cardProduct: {
            ...mockCardProduct,
            benefits: [mockBenefit],
          },
        },
      };

      const mockTransaction = {
        id: 'txn_1',
        plaidTransaction: {
          id: 'plaid_txn_1',
          date: new Date('2025-11-15'),
          amount: 50,
          name: 'Hotel Booking',
        },
      };

      const mockUsage = {
        id: 'usage_1',
        cardBenefitId: 'benefit_1',
        usedAmount: 150,
        periodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        transactionExtensions: [mockTransaction],
      };

      (prisma.plaidAccount.findMany as jest.Mock).mockResolvedValue([mockAccount]);
      (prisma.benefitUsage.findMany as jest.Mock).mockResolvedValue([mockUsage]);

      const request = new Request('http://localhost/api/benefits/usage');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.benefits).toHaveLength(1);
      
      const benefit = data.benefits[0];
      expect(benefit.benefitName).toBe('$300 Travel Credit');
      expect(benefit.cardProductName).toBe('Chase Sapphire Reserve');
      expect(benefit.maxAmount).toBe(300);
      expect(benefit.usedAmount).toBe(150);
      expect(benefit.remainingAmount).toBe(150);
      expect(benefit.percentage).toBe(50);
      expect(benefit.transactionCount).toBe(1);
      expect(benefit.daysRemaining).toBeGreaterThan(0);

      console.log('✅ US-011: Complete benefit usage flow works');
    });

    it('should filter by specific account if provided', async () => {
      const mockAccount1 = {
        id: 'account_1',
        extended: {
          cardProduct: {
            ...mockCardProduct,
            benefits: [mockBenefit],
          },
        },
      };

      (prisma.plaidAccount.findMany as jest.Mock).mockResolvedValue([mockAccount1]);
      (prisma.benefitUsage.findMany as jest.Mock).mockResolvedValue([]);

      const request = new Request('http://localhost/api/benefits/usage?accountId=account_1');
      await GET(request);

      // Verify findMany was called with accountId filter
      expect(prisma.plaidAccount.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: 'account_1',
          }),
        })
      );

      console.log('✅ US-011: Filters by specific account');
    });
  });

  describe('Error Handling', () => {
    it('should return 401 if user not authenticated', async () => {
      (auth as jest.Mock).mockResolvedValue({ userId: null });

      const request = new Request('http://localhost/api/benefits/usage');
      const response = await GET(request);

      expect(response.status).toBe(401);

      console.log('✅ Returns 401 for unauthenticated requests');
    });

    it('should return 404 if user profile not found', async () => {
      (prisma.userProfile.findUnique as jest.Mock).mockResolvedValue(null);

      const request = new Request('http://localhost/api/benefits/usage');
      const response = await GET(request);

      expect(response.status).toBe(404);

      console.log('✅ Returns 404 if user profile missing');
    });

    it('should return 500 on database error', async () => {
      (prisma.userProfile.findUnique as jest.Mock).mockRejectedValue(new Error('DB error'));

      const request = new Request('http://localhost/api/benefits/usage');
      const response = await GET(request);

      expect(response.status).toBe(500);

      console.log('✅ Returns 500 on database error');
    });
  });
});
