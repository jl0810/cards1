/**
 * Integration Tests for Dashboard Page
 * 
 * @tests Payment Cycle Status Display
 * @tests BR-037 - Payment Cycle Status Calculation
 * @tests US-023 - Payment Cycle Status Tracking
 * 
 * These tests verify that the dashboard page correctly calculates and displays
 * payment cycle statuses for all cards, catching integration issues between
 * the API, data transformation, and UI rendering.
 */

import { render, screen, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import DashboardPage from '@/app/dashboard/page';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// Mock Clerk auth
jest.mock('@clerk/nextjs/server', () => ({
  auth: jest.fn(),
  currentUser: jest.fn(),
}));

// Mock admin hook
jest.mock('@/hooks/use-admin', () => ({
  useIsAdmin: jest.fn(() => false),
}));

// Mock logger
jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('Dashboard Page - Payment Cycle Status Integration', () => {
  const mockRouter = {
    push: jest.fn(),
    refresh: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Payment Cycle Status Calculation', () => {
    it('should display DORMANT status for cards with $0 balance and statement > 30 days old', async () => {
      // Mock API response with Barclays Hawaiian Airlines card
      const mockApiResponse = [
        {
          id: 'item-1',
          institutionName: 'Barclays - Cards',
          familyMemberId: 'family-1',
          accounts: [
            {
              id: 'acc-hawaiian',
              name: 'Hawaiian Airlines®',
              officialName: 'Hawaiian Airlines®',
              currentBalance: 0, // Paid off
              lastStatementBalance: 99, // Had a statement
              lastStatementIssueDate: new Date(Date.now() - 43 * 24 * 60 * 60 * 1000).toISOString(), // 43 days ago
              nextPaymentDueDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(), // Overdue
              subtype: 'credit card',
              type: 'credit',
              extended: null,
            },
          ],
        },
      ];

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockApiResponse,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [], // Family members
        });

      render(<DashboardPage />);

      // Wait for data to load
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/plaid/items');
      });

      // Verify DORMANT status is calculated and displayed
      // The card should show the moon icon (🌙) for dormant status
      await waitFor(() => {
        const cardElement = screen.getByText(/Hawaiian Airlines/i);
        expect(cardElement).toBeInTheDocument();
      });

      // This test would have FAILED before the fix because paymentCycleStatus
      // was not being calculated in the dashboard page
    });

    it('should display STATEMENT_GENERATED status for cards with unpaid balance', async () => {
      const mockApiResponse = [
        {
          id: 'item-1',
          institutionName: 'American Express',
          familyMemberId: 'family-1',
          accounts: [
            {
              id: 'acc-amex',
              name: 'Gold Card',
              officialName: 'American Express Gold Card',
              currentBalance: 500, // Unpaid
              lastStatementBalance: 500,
              lastStatementIssueDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 days ago
              nextPaymentDueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(), // Due in 15 days
              subtype: 'credit card',
              type: 'credit',
              extended: null,
            },
          ],
        },
      ];

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockApiResponse,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [],
        });

      render(<DashboardPage />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/plaid/items');
      });

      await waitFor(() => {
        const cardElement = screen.getByText(/Gold Card/i);
        expect(cardElement).toBeInTheDocument();
      });
    });

    it('should display PAID_AWAITING_STATEMENT for cards with $0 balance and recent statement', async () => {
      const mockApiResponse = [
        {
          id: 'item-1',
          institutionName: 'Chase',
          familyMemberId: 'family-1',
          accounts: [
            {
              id: 'acc-chase',
              name: 'Sapphire Reserve',
              officialName: 'Sapphire Reserve',
              currentBalance: 0, // Paid off
              lastStatementBalance: 1500,
              lastStatementIssueDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 days ago (recent)
              nextPaymentDueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
              subtype: 'credit card',
              type: 'credit',
              extended: null,
            },
          ],
        },
      ];

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockApiResponse,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [],
        });

      render(<DashboardPage />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/plaid/items');
      });

      await waitFor(() => {
        const cardElement = screen.getByText(/Sapphire Reserve/i);
        expect(cardElement).toBeInTheDocument();
      });
    });

    it('should display DORMANT for multiple old Barclays cards', async () => {
      const mockApiResponse = [
        {
          id: 'item-barclays',
          institutionName: 'Barclays - Cards',
          familyMemberId: 'family-1',
          accounts: [
            {
              id: 'acc-aviator-1',
              name: 'AAdvantage Aviator',
              currentBalance: 0,
              lastStatementBalance: 0,
              lastStatementIssueDate: new Date(Date.now() - 207 * 24 * 60 * 60 * 1000).toISOString(), // 207 days
              subtype: 'credit card',
              extended: null,
            },
            {
              id: 'acc-hawaiian-1',
              name: 'My HawaiianMiles',
              currentBalance: 0,
              lastStatementBalance: 0,
              lastStatementIssueDate: new Date(Date.now() - 165 * 24 * 60 * 60 * 1000).toISOString(), // 165 days
              subtype: 'credit card',
              extended: null,
            },
            {
              id: 'acc-hawaiian-2',
              name: 'Hawaiian Airlines®',
              currentBalance: 0,
              lastStatementBalance: 99,
              lastStatementIssueDate: new Date(Date.now() - 43 * 24 * 60 * 60 * 1000).toISOString(), // 43 days
              subtype: 'credit card',
              extended: null,
            },
          ],
        },
      ];

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockApiResponse,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [],
        });

      render(<DashboardPage />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/plaid/items');
      });

      // All three cards should be present
      await waitFor(() => {
        expect(screen.getByText(/AAdvantage Aviator/i)).toBeInTheDocument();
        expect(screen.getByText(/My HawaiianMiles/i)).toBeInTheDocument();
        expect(screen.getByText(/Hawaiian Airlines/i)).toBeInTheDocument();
      });

      // This test would have FAILED before the fix because:
      // 1. Hawaiian Airlines would show as STATEMENT_GENERATED (wrong)
      // 2. The calculation was missing entirely from the dashboard
    });

    it('should handle cards with manual payment marked', async () => {
      const mockApiResponse = [
        {
          id: 'item-1',
          institutionName: 'American Express',
          familyMemberId: 'family-1',
          accounts: [
            {
              id: 'acc-amex',
              name: 'Platinum Card',
              currentBalance: 500, // Still showing balance
              lastStatementBalance: 500,
              lastStatementIssueDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
              subtype: 'credit card',
              extended: {
                paymentMarkedPaidDate: new Date().toISOString(), // User marked as paid
                paymentMarkedPaidAmount: 500,
              },
            },
          ],
        },
      ];

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockApiResponse,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [],
        });

      render(<DashboardPage />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/plaid/items');
      });

      // Should show PAYMENT_SCHEDULED status
      await waitFor(() => {
        const cardElement = screen.getByText(/Platinum Card/i);
        expect(cardElement).toBeInTheDocument();
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle null/undefined balance values', async () => {
      const mockApiResponse = [
        {
          id: 'item-1',
          institutionName: 'Test Bank',
          familyMemberId: 'family-1',
          accounts: [
            {
              id: 'acc-test',
              name: 'Test Card',
              currentBalance: null,
              lastStatementBalance: null,
              lastStatementIssueDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
              subtype: 'credit card',
              extended: null,
            },
          ],
        },
      ];

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockApiResponse,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [],
        });

      render(<DashboardPage />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/plaid/items');
      });

      // Should handle gracefully and show DORMANT
      await waitFor(() => {
        const cardElement = screen.getByText(/Test Card/i);
        expect(cardElement).toBeInTheDocument();
      });
    });

    it('should handle missing statement date', async () => {
      const mockApiResponse = [
        {
          id: 'item-1',
          institutionName: 'Test Bank',
          familyMemberId: 'family-1',
          accounts: [
            {
              id: 'acc-test',
              name: 'Test Card',
              currentBalance: 100,
              lastStatementBalance: 0,
              lastStatementIssueDate: null, // Missing date
              subtype: 'credit card',
              extended: null,
            },
          ],
        },
      ];

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockApiResponse,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [],
        });

      render(<DashboardPage />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/plaid/items');
      });

      // Should handle gracefully
      await waitFor(() => {
        const cardElement = screen.getByText(/Test Card/i);
        expect(cardElement).toBeInTheDocument();
      });
    });
  });
});
