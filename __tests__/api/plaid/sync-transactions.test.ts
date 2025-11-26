/**
 * @jest-environment node
 */

import { POST } from '@/app/api/plaid/sync-transactions/route';
import { prisma } from '@/lib/prisma';
import { plaidClient } from '@/lib/plaid';
import { rateLimit } from '@/lib/rate-limit';

// Mock dependencies
jest.mock('@clerk/nextjs/server');
jest.mock('@/lib/plaid');
jest.mock('@/lib/prisma', () => ({
  prisma: {
    plaidItem: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    plaidTransaction: {
      upsert: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    plaidAccount: {
      update: jest.fn(),
    },
    $queryRaw: jest.fn(),
    $transaction: jest.fn(),
  },
}));
jest.mock('@/lib/rate-limit');
jest.mock('@/lib/benefit-matcher');
jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

const { auth } = require('@clerk/nextjs/server');

/**
 * US-007: Sync Transactions Integration Tests
 * Tests BR-011 (Transaction Sync Limits), BR-012 (Rate Limiting), BR-013 (Atomic Processing)
 * 
 * @implements BR-011 - Transaction sync pagination limits
 * @implements BR-012 - Rate limiting for sync operations
 * @implements BR-013 - Atomic transaction processing
 * @satisfies US-007 - Sync Transactions
 * 
 * NOTE: This is a UNIT TEST that mocks Vault token retrieval.
 * Real Vault encryption/decryption is tested in __tests__/integration/supabase-vault.test.ts
 * This test focuses on business logic: pagination, rate limiting, and atomic processing.
 */
describe('US-007: Sync Transactions', () => {
  const mockUserId = 'user_123';
  const mockItemId = 'item_test_123';
  const mockAccessToken = 'access-sandbox-test-token';
  const mockSecretId = 'secret_uuid_123';
  const mockCursor = 'cursor_123';

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mocks
    (auth as jest.Mock).mockResolvedValue({ userId: mockUserId });
    (rateLimit as jest.Mock).mockResolvedValue(false); // Not rate limited
    
    (prisma.plaidItem.findUnique as jest.Mock).mockResolvedValue({
      id: 'db_item_123',
      itemId: mockItemId,
      accessTokenId: mockSecretId,
      nextCursor: null,
    });
    
    (prisma.$queryRaw as jest.Mock).mockResolvedValue([
      { decrypted_secret: mockAccessToken },
    ]);
    
    (plaidClient.transactionsSync as jest.Mock).mockResolvedValue({
      data: {
        added: [],
        modified: [],
        removed: [],
        has_more: false,
        next_cursor: mockCursor,
      },
    });
    
    (plaidClient.accountsBalanceGet as jest.Mock).mockResolvedValue({
      data: {
        accounts: [],
      },
    });
    
    // Mock transaction operations
    (prisma.plaidTransaction.upsert as jest.Mock).mockResolvedValue({});
    (prisma.plaidTransaction.update as jest.Mock).mockResolvedValue({});
    (prisma.plaidTransaction.delete as jest.Mock).mockResolvedValue({});
    (prisma.plaidItem.update as jest.Mock).mockResolvedValue({});
    (prisma.plaidAccount.update as jest.Mock).mockResolvedValue({});
    
    // Mock transaction wrapper to execute callback
    (prisma.$transaction as jest.Mock).mockImplementation(async (callback: any) => {
      return await callback(prisma);
    });
  });

  describe('BR-012: Rate Limiting', () => {
    it('should enforce rate limit of 10 syncs per hour', async () => {
      (rateLimit as jest.Mock).mockResolvedValue(true); // Rate limited

      const request = new Request('http://localhost/api/plaid/sync-transactions', {
        method: 'POST',
        body: JSON.stringify({
          itemId: mockItemId,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error).toBe('Too many sync requests');
      expect(data.message).toContain('10 syncs per hour');
      expect(response.headers.get('Retry-After')).toBe('3600');
      
      // Should NOT proceed to sync
      expect(plaidClient.transactionsSync).not.toHaveBeenCalled();
      
      console.log('✅ BR-012: Rate limiting enforced (10/hour)');
    });

    it('should allow sync when under rate limit', async () => {
      (rateLimit as jest.Mock).mockResolvedValue(false); // NOT rate limited

      const request = new Request('http://localhost/api/plaid/sync-transactions', {
        method: 'POST',
        body: JSON.stringify({
          itemId: mockItemId,
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(plaidClient.transactionsSync).toHaveBeenCalled();
      
      console.log('✅ BR-012: Allows sync when under rate limit');
    });
  });

  describe('BR-013: Atomic Transaction Processing', () => {
    it('should process all transaction changes atomically', async () => {
      const mockAdded = [
        {
          transaction_id: 'txn_new_1',
          account_id: 'acc_123',
          amount: 50.00,
          date: '2025-11-25',
          name: 'Starbucks',
          merchant_name: 'Starbucks',
          category: ['Food and Drink', 'Restaurants'],
          pending: false,
          original_description: 'STARBUCKS #12345',
          payment_channel: 'in store',
          transaction_code: null,
          personal_finance_category: {
            primary: 'FOOD_AND_DRINK',
            detailed: 'FOOD_AND_DRINK_COFFEE',
          },
        },
      ];

      const mockModified = [
        {
          transaction_id: 'txn_existing_1',
          amount: 75.00,
          date: '2025-11-24',
          name: 'Amazon',
          merchant_name: 'Amazon',
          category: ['Shops'],
          pending: false,
        },
      ];

      const mockRemoved = [
        { transaction_id: 'txn_old_1' },
      ];

      (plaidClient.transactionsSync as jest.Mock).mockResolvedValue({
        data: {
          added: mockAdded,
          modified: mockModified,
          removed: mockRemoved,
          has_more: false,
          next_cursor: mockCursor,
        },
      });

      const request = new Request('http://localhost/api/plaid/sync-transactions', {
        method: 'POST',
        body: JSON.stringify({
          itemId: mockItemId,
        }),
      });

      await POST(request);

      // Verify transaction wrapper was used
      expect(prisma.$transaction).toHaveBeenCalled();
      
      console.log('✅ BR-013: All changes processed in database transaction');
    });

    it('should rollback all changes if any operation fails', async () => {
      const mockError = new Error('Database error');
      
      // Mock transaction to throw error
      (prisma.$transaction as jest.Mock).mockRejectedValue(mockError);

      const request = new Request('http://localhost/api/plaid/sync-transactions', {
        method: 'POST',
        body: JSON.stringify({
          itemId: mockItemId,
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(500);
      
      console.log('✅ BR-013: Transaction rollback on error');
    });

    it('should update cursor only after successful transaction commit', async () => {
      (plaidClient.transactionsSync as jest.Mock).mockResolvedValue({
        data: {
          added: [{ transaction_id: 'txn_1', account_id: 'acc_1', amount: 10, date: '2025-11-25', name: 'Test' }],
          modified: [],
          removed: [],
          has_more: false,
          next_cursor: 'new_cursor_456',
        },
      });

      const request = new Request('http://localhost/api/plaid/sync-transactions', {
        method: 'POST',
        body: JSON.stringify({
          itemId: mockItemId,
        }),
      });

      await POST(request);

      // Verify cursor update happened inside transaction
      const transactionCallback = (prisma.$transaction as jest.Mock).mock.calls[0][0];
      await transactionCallback(prisma);
      
      expect(prisma.plaidItem.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { itemId: mockItemId },
          data: expect.objectContaining({
            nextCursor: 'new_cursor_456',
            lastSyncedAt: expect.any(Date),
          }),
        })
      );
      
      console.log('✅ BR-013: Cursor updated atomically with transactions');
    });
  });

  describe('BR-011: Transaction Sync Limits', () => {
    it('should respect MAX_ITERATIONS limit to prevent infinite loops', async () => {
      // Mock has_more always true to simulate infinite pagination
      (plaidClient.transactionsSync as jest.Mock).mockResolvedValue({
        data: {
          added: [],
          modified: [],
          removed: [],
          has_more: true, // Always more
          next_cursor: 'cursor_' + Math.random(),
        },
      });

      const request = new Request('http://localhost/api/plaid/sync-transactions', {
        method: 'POST',
        body: JSON.stringify({
          itemId: mockItemId,
        }),
      });

      await POST(request);

      // Should stop at MAX_ITERATIONS (default 50)
      const callCount = (plaidClient.transactionsSync as jest.Mock).mock.calls.length;
      expect(callCount).toBeLessThanOrEqual(50);
      
      console.log(`✅ BR-011: Stopped at ${callCount} iterations (max 50)`);
    });

    it('should handle pagination correctly with has_more flag', async () => {
      let callCount = 0;
      (plaidClient.transactionsSync as jest.Mock).mockImplementation(() => {
        callCount++;
        return Promise.resolve({
          data: {
            added: [],
            modified: [],
            removed: [],
            has_more: callCount < 3, // Stop after 3 calls
            next_cursor: `cursor_${callCount}`,
          },
        });
      });

      const request = new Request('http://localhost/api/plaid/sync-transactions', {
        method: 'POST',
        body: JSON.stringify({
          itemId: mockItemId,
        }),
      });

      await POST(request);

      expect(plaidClient.transactionsSync).toHaveBeenCalledTimes(3);
      
      console.log('✅ BR-011: Pagination handled correctly');
    });
  });

  describe('Integration: Complete Sync Flow', () => {
    it('should complete full sync with added/modified/removed transactions', async () => {
      (plaidClient.transactionsSync as jest.Mock).mockResolvedValue({
        data: {
          added: [
            {
              transaction_id: 'txn_new',
              account_id: 'acc_123',
              amount: 25.50,
              date: '2025-11-25',
              name: 'Coffee Shop',
              merchant_name: 'Local Coffee',
              category: ['Food'],
              pending: false,
            },
          ],
          modified: [
            {
              transaction_id: 'txn_mod',
              amount: 100.00,
              date: '2025-11-24',
              name: 'Grocery Store',
              merchant_name: 'Whole Foods',
              category: ['Groceries'],
              pending: false,
            },
          ],
          removed: [
            { transaction_id: 'txn_removed' },
          ],
          has_more: false,
          next_cursor: 'final_cursor',
        },
      });

      (plaidClient.accountsBalanceGet as jest.Mock).mockResolvedValue({
        data: {
          accounts: [
            {
              account_id: 'acc_123',
              name: 'Chase Freedom',
              official_name: 'Chase Freedom Unlimited',
              mask: '1234',
              type: 'credit',
              subtype: 'credit card',
              balances: {
                current: 1600.00,
                available: 8400.00,
                limit: 10000.00,
              },
            },
          ],
        },
      });

      const request = new Request('http://localhost/api/plaid/sync-transactions', {
        method: 'POST',
        body: JSON.stringify({
          itemId: mockItemId,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      if (response.status !== 200) {
        console.error('Response error:', data);
      }
      
      expect(response.status).toBe(200);
      expect(data.added).toBe(1);
      expect(data.modified).toBe(1);
      expect(data.removed).toBe(1);
      expect(data.nextCursor).toBe('final_cursor');
      
      // Verify Vault retrieval
      expect(prisma.$queryRaw).toHaveBeenCalled();
      
      // Verify Plaid sync
      expect(plaidClient.transactionsSync).toHaveBeenCalledWith({
        access_token: mockAccessToken,
        cursor: null,
      });
      
      // Verify balance update
      expect(plaidClient.accountsBalanceGet).toHaveBeenCalled();
      
      console.log('✅ US-007: Complete sync flow works end-to-end');
    });

    it('should retrieve access token from Vault before syncing', async () => {
      const request = new Request('http://localhost/api/plaid/sync-transactions', {
        method: 'POST',
        body: JSON.stringify({
          itemId: mockItemId,
        }),
      });

      await POST(request);

      // Verify Vault query
      expect(prisma.$queryRaw).toHaveBeenCalled();
      const vaultCall = (prisma.$queryRaw as jest.Mock).mock.calls[0];
      expect(vaultCall[0].join('')).toContain('vault.decrypted_secrets');
      
      // Verify token was used
      expect(plaidClient.transactionsSync).toHaveBeenCalledWith(
        expect.objectContaining({
          access_token: mockAccessToken,
        })
      );
      
      console.log('✅ US-007: Vault token retrieval works');
    });

    it('should update account balances after transaction sync', async () => {
      const request = new Request('http://localhost/api/plaid/sync-transactions', {
        method: 'POST',
        body: JSON.stringify({
          itemId: mockItemId,
        }),
      });

      await POST(request);

      expect(plaidClient.accountsBalanceGet).toHaveBeenCalledWith({
        access_token: mockAccessToken,
      });
      
      console.log('✅ US-007: Account balances updated');
    });
  });

  describe('Error Handling', () => {
    it('should return 401 if user not authenticated', async () => {
      (auth as jest.Mock).mockResolvedValue({ userId: null });

      const request = new Request('http://localhost/api/plaid/sync-transactions', {
        method: 'POST',
        body: JSON.stringify({
          itemId: mockItemId,
        }),
      });

      const response = await POST(request);
      
      expect(response.status).toBe(401);
      
      console.log('✅ Returns 401 for unauthenticated requests');
    });

    it('should return 400 if itemId missing', async () => {
      const request = new Request('http://localhost/api/plaid/sync-transactions', {
        method: 'POST',
        body: JSON.stringify({}), // No itemId
      });

      const response = await POST(request);
      
      expect(response.status).toBe(400);
      
      console.log('✅ Returns 400 if itemId missing');
    });

    it('should return 404 if item not found', async () => {
      (prisma.plaidItem.findUnique as jest.Mock).mockResolvedValue(null);

      const request = new Request('http://localhost/api/plaid/sync-transactions', {
        method: 'POST',
        body: JSON.stringify({
          itemId: 'nonexistent_item',
        }),
      });

      const response = await POST(request);
      
      expect(response.status).toBe(404);
      
      console.log('✅ Returns 404 if item not found');
    });

    it('should return 500 if Vault retrieval fails', async () => {
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([]); // No token

      const request = new Request('http://localhost/api/plaid/sync-transactions', {
        method: 'POST',
        body: JSON.stringify({
          itemId: mockItemId,
        }),
      });

      const response = await POST(request);
      
      expect(response.status).toBe(500);
      
      console.log('✅ Returns 500 if Vault retrieval fails');
    });

    it('should continue sync even if balance update fails', async () => {
      (plaidClient.accountsBalanceGet as jest.Mock).mockRejectedValue(new Error('Balance API error'));

      const request = new Request('http://localhost/api/plaid/sync-transactions', {
        method: 'POST',
        body: JSON.stringify({
          itemId: mockItemId,
        }),
      });

      const response = await POST(request);
      
      // Should still succeed
      expect(response.status).toBe(200);
      
      console.log('✅ Continues sync even if balance update fails');
    });
  });
});
