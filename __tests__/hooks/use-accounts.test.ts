import { describe, expect, it, jest, beforeEach, afterEach } from '@jest/globals';
import { renderHook, waitFor } from '@testing-library/react';
import { useAccounts } from '@/hooks/use-accounts';

// Mock fetch with proper typing
global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>;

describe('useAccounts Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true,
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Initial State', () => {
    it('should start with loading state', () => {
      (global.fetch as jest.Mock).mockImplementation(() =>
        new Promise(() => {}) // Never resolves
      );

      const { result } = renderHook(() => useAccounts());

      expect(result.current.loading).toBe(true);
      expect(result.current.accounts).toEqual([]);
      expect(result.current.error).toBeNull();
      expect(result.current.offline).toBe(false);
    });
  });

  describe('Successful Data Fetch', () => {
    it('should fetch and transform accounts', async () => {
      const mockData = [
        {
          id: 'item_1',
          institutionName: 'Chase',
          accounts: [
            {
              id: 'acc_1',
              name: 'Sapphire Preferred',
              officialName: 'Chase Sapphire Preferred',
              type: 'credit',
              subtype: 'credit card',
              currentBalance: -1500.50,
              limit: 10000,
              isoCurrencyCode: 'USD',
              apr: 24.99,
              minPaymentAmount: 25,
              lastStatementBalance: 1500.50,
              nextPaymentDueDate: new Date('2025-02-15').toISOString(),
              lastStatementIssueDate: new Date('2025-01-15').toISOString(),
              extended: {
                nickname: 'Travel Card',
              },
            },
          ],
        },
      ];

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockData,
      });

      const { result } = renderHook(() => useAccounts());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Validate fetch was called with correct endpoint
      expect(global.fetch).toHaveBeenCalledWith('/api/plaid/items');

      expect(result.current.accounts).toHaveLength(1);
      expect(result.current.accounts[0]).toMatchObject({
        id: 'acc_1',
        bank: 'Chase',
        name: 'Travel Card', // Uses nickname from extended
        type: 'credit card',
      });
      expect(result.current.error).toBeNull();
    });

    it('should handle multiple accounts from multiple items', async () => {
      const mockData = [
        {
          id: 'item_1',
          institutionName: 'Chase',
          accounts: [
            { id: 'acc_1', name: 'Card 1', currentBalance: 1000 },
            { id: 'acc_2', name: 'Card 2', currentBalance: 2000 },
          ],
        },
        {
          id: 'item_2',
          institutionName: 'Amex',
          accounts: [{ id: 'acc_3', name: 'Card 3', currentBalance: 3000 }],
        },
      ];

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockData,
      });

      const { result } = renderHook(() => useAccounts());

      await waitFor(() => {
        expect(result.current.accounts).toHaveLength(3);
      });

      // Validate correct endpoint called
      expect(global.fetch).toHaveBeenCalledWith('/api/plaid/items');

      expect(result.current.accounts[0].bank).toBe('Chase');
      expect(result.current.accounts[2].bank).toBe('Amex');
    });

    it('should return empty array for 404 response', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 404,
        text: async () => 'User profile not found',
      });

      const { result } = renderHook(() => useAccounts());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Validate correct endpoint called even on 404
      expect(global.fetch).toHaveBeenCalledWith('/api/plaid/items');

      expect(result.current.accounts).toEqual([]);
      expect(result.current.error).toBeNull();
    });
  });

  describe('Data Transformation', () => {
    it('should calculate due date correctly', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const mockData = [
        {
          institutionName: 'Bank',
          accounts: [
            {
              id: 'acc_1',
              name: 'Card',
              nextPaymentDueDate: tomorrow.toISOString(),
            },
          ],
        },
      ];

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockData,
      });

      const { result } = renderHook(() => useAccounts());

      await waitFor(() => {
        expect(result.current.accounts[0]?.due).toBe('Tomorrow');
      });

      expect(global.fetch).toHaveBeenCalledWith('/api/plaid/items');
    });

    it('should show "Today" for due date today', async () => {
      const today = new Date();
      today.setHours(23, 59, 59); // End of today

      const mockData = [
        {
          institutionName: 'Bank',
          accounts: [
            {
              id: 'acc_1',
              name: 'Card',
              nextPaymentDueDate: today.toISOString(),
            },
          ],
        },
      ];

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockData,
      });

      const { result } = renderHook(() => useAccounts());

      await waitFor(() => {
        expect(result.current.accounts[0]?.due).toBe('Today');
      });

      expect(global.fetch).toHaveBeenCalledWith('/api/plaid/items');
    });

    it('should show "Overdue" for past due dates', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const mockData = [
        {
          institutionName: 'Bank',
          accounts: [
            {
              id: 'acc_1',
              name: 'Card',
              nextPaymentDueDate: yesterday.toISOString(),
            },
          ],
        },
      ];

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockData,
      });

      const { result } = renderHook(() => useAccounts());

      await waitFor(() => {
        expect(result.current.accounts[0]?.due).toBe('Overdue');
      });

      expect(global.fetch).toHaveBeenCalledWith('/api/plaid/items');
    });

    it('should format currency correctly', async () => {
      const mockData = [
        {
          institutionName: 'Bank',
          accounts: [
            {
              id: 'acc_1',
              name: 'Card',
              currentBalance: 1234.56,
              limit: 10000,
              isoCurrencyCode: 'USD',
              apr: 24.99,
              minPaymentAmount: 25.00,
            },
          ],
        },
      ];

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockData,
      });

      const { result } = renderHook(() => useAccounts());

      await waitFor(() => {
        expect(result.current.accounts[0]?.liabilities.limit).toContain('$10,000');
        expect(result.current.accounts[0]?.liabilities.min_due).toContain('$25');
      });

      expect(global.fetch).toHaveBeenCalledWith('/api/plaid/items');
    });

    it('should format APR as percentage', async () => {
      const mockData = [
        {
          institutionName: 'Bank',
          accounts: [
            {
              id: 'acc_1',
              name: 'Card',
              apr: 24.99,
            },
          ],
        },
      ];

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockData,
      });

      const { result } = renderHook(() => useAccounts());

      await waitFor(() => {
        expect(result.current.accounts[0]?.liabilities.apr).toBe('24.99%');
      });

      expect(global.fetch).toHaveBeenCalledWith('/api/plaid/items');
    });

    it('should handle null/undefined values gracefully', async () => {
      const mockData = [
        {
          institutionName: 'Bank',
          accounts: [
            {
              id: 'acc_1',
              name: 'Card',
              currentBalance: null,
              limit: undefined,
              apr: null,
              nextPaymentDueDate: null,
            },
          ],
        },
      ];

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockData,
      });

      const { result } = renderHook(() => useAccounts());

      await waitFor(() => {
        expect(result.current.accounts[0]?.balance).toBe(0);
        expect(result.current.accounts[0]?.due).toBe('N/A');
        expect(result.current.accounts[0]?.liabilities.apr).toBe('N/A');
        expect(result.current.accounts[0]?.liabilities.limit).toBe('N/A');
      });

      expect(global.fetch).toHaveBeenCalledWith('/api/plaid/items');
    });
  });

  describe('Error Handling', () => {
    it('should handle fetch errors', async () => {
      const errorMessage = 'Network error';
      (global.fetch as jest.Mock).mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() => useAccounts());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(global.fetch).toHaveBeenCalledWith('/api/plaid/items');
      expect(result.current.error).toBeDefined();
      expect(result.current.error?.message).toBe(errorMessage);
      expect(result.current.accounts).toEqual([]);
    });

    it('should handle non-404 HTTP errors', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error',
      });

      const { result } = renderHook(() => useAccounts());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(global.fetch).toHaveBeenCalledWith('/api/plaid/items');
      expect(result.current.error).toBeDefined();
      expect(result.current.accounts).toEqual([]);
    });

    it('should detect offline status', async () => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });

      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useAccounts());

      await waitFor(() => {
        expect(result.current.offline).toBe(true);
      });

      expect(global.fetch).toHaveBeenCalledWith('/api/plaid/items');
    });
  });

  describe('Refresh Functionality', () => {
    it('should allow manual refresh', async () => {
      const mockData = [
        {
          institutionName: 'Bank',
          accounts: [{ id: 'acc_1', name: 'Card 1' }],
        },
      ];

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockData,
      });

      const { result } = renderHook(() => useAccounts());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(global.fetch).toHaveBeenCalledTimes(1);

      // Call refresh
      await result.current.refresh();

      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should clear errors on refresh', async () => {
      // First call fails
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Error'));

      const { result } = renderHook(() => useAccounts());

      await waitFor(() => {
        expect(result.current.error).toBeDefined();
      });

      // Second call succeeds
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      await result.current.refresh();

      await waitFor(() => {
        expect(result.current.error).toBeNull();
      });
    });
  });
});
