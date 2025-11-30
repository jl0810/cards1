/**
 * @jest-environment node
 * 
 * REAL Integration Test for Transaction Sync (US-007)
 * 
 * Tests BR-011 (Transaction Sync Limits), BR-012 (Rate Limiting), BR-013 (Atomic Processing)
 * 
 * This test uses:
 * - REAL Prisma connection
 * - REAL Vault encryption/decryption
 * - REAL database transactions
 * - MOCKED Clerk (external auth service)
 * - MOCKED Plaid API (external service)
 * - MOCKED Rate Limiting (Upstash)
 * 
 * @implements BR-011 - Transaction Sync Limits
 * @implements BR-012 - Transaction Sync Rate Limiting
 * @implements BR-013 - Atomic Transaction Processing
 * @satisfies US-007 - Sync Transactions
 */

// Mock external services BEFORE imports
jest.mock('@/env', () => ({
  env: {
    PLAID_CLIENT_ID: 'test',
    PLAID_SECRET: 'test',
    PLAID_ENV: 'sandbox',
  },
}));

jest.mock('@clerk/nextjs/server', () => ({
  auth: jest.fn(),
}));

jest.mock('@/lib/rate-limit', () => ({
  rateLimit: jest.fn().mockResolvedValue(false), // Not rate limited by default
  RATE_LIMITS: {
    plaidSync: { requests: 10, window: '1 h' },
  },
}));

jest.mock('plaid', () => {
  const mockTransactionsSync = jest.fn();
  const mockAccountsBalanceGet = jest.fn();
  
  return {
    Configuration: jest.fn(),
    PlaidApi: jest.fn().mockImplementation(() => ({
      transactionsSync: mockTransactionsSync,
      accountsBalanceGet: mockAccountsBalanceGet,
    })),
    PlaidEnvironments: {
      sandbox: 'https://sandbox.plaid.com',
    },
    __mockTransactionsSync: mockTransactionsSync,
    __mockAccountsBalanceGet: mockAccountsBalanceGet,
  };
});

// Mock benefit matcher
jest.mock('@/lib/benefit-matcher', () => ({
  scanAndMatchBenefits: jest.fn().mockResolvedValue(undefined),
  matchTransactionToBenefits: jest.fn(),
  linkTransactionToBenefit: jest.fn(),
}));

import { POST } from '@/app/api/plaid/sync-transactions/route';
import { auth } from '@clerk/nextjs/server';
import { rateLimit } from '@/lib/rate-limit';
import * as plaidModule from 'plaid';
import { PrismaClient } from '../../../generated/prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { MockPlaidModuleSchema, ClerkAuthMockSchema } from '@/lib/validations';
import type { z } from 'zod';

type MockPlaidModule = z.infer<typeof MockPlaidModuleSchema>;
type ClerkAuthMock = z.infer<typeof ClerkAuthMockSchema>;

const mockTransactionsSync = (plaidModule as MockPlaidModule).__mockTransactionsSync;
const mockAccountsBalanceGet = (plaidModule as MockPlaidModule).__mockAccountsBalanceGet;

// CRITICAL: Use DIRECT_URL for Vault access (not pooled connection)
const directUrl = process.env.DIRECT_URL;
const SHOULD_RUN = !!directUrl;

const describeIf = SHOULD_RUN ? describe : describe.skip;

let prisma: PrismaClient;
let pool: Pool;

if (SHOULD_RUN) {
  pool = new Pool({
    connectionString: directUrl,
    ssl: { rejectUnauthorized: false },
  });
  const adapter = new PrismaPg(pool);
  prisma = new PrismaClient({ adapter });
} else {
  console.warn('⚠️  Skipping Vault integration tests - DIRECT_URL not set');
}

describeIf('REAL Integration: Transaction Sync (US-007)', () => {
  let testUserId: string;
  let testClerkId: string;
  let testFamilyMemberId: string;
  let testItemId: string;
  let testPlaidItemId: string;
  let testAccountId: string;
  let testSecretId: string;

  beforeAll(async () => {
    testClerkId = 'test_clerk_sync_' + Date.now();
    testPlaidItemId = 'plaid_item_sync_' + Date.now();
    
    // Create REAL test user
    const testUser = await prisma.userProfile.create({
      data: {
        clerkId: testClerkId,
        name: 'Test Sync User',
      },
    });
    testUserId = testUser.id;

    // Create REAL primary family member
    const testFamilyMember = await prisma.familyMember.create({
      data: {
        userId: testUserId,
        name: 'Test Sync User',
        isPrimary: true,
      },
    });
    testFamilyMemberId = testFamilyMember.id;

    // Create REAL Vault secret
    const vaultResult = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT vault.create_secret('access-token-sync-' || ${Date.now()}, 'Test Sync', 'Integration test') as id;
    `;
    testSecretId = vaultResult[0]?.id;

    // Create REAL Plaid item
    const testItem = await prisma.plaidItem.create({
      data: {
        userId: testUserId,
        familyMemberId: testFamilyMemberId,
        itemId: testPlaidItemId,
        institutionId: 'ins_test_sync',
        institutionName: 'Test Sync Bank',
        accessTokenId: testSecretId,
        status: 'active',
      },
    });
    testItemId = testItem.id;

    // Create REAL test account
    const testAccount = await prisma.plaidAccount.create({
      data: {
        plaidItemId: testItemId,
        accountId: 'acc_test_sync_' + Date.now(),
        name: 'Test Sync Account',
        mask: '1234',
        type: 'depository',
        subtype: 'checking',
        familyMemberId: testFamilyMemberId,
      },
    });
    testAccountId = testAccount.accountId;
  });

  afterAll(async () => {
    // Cleanup REAL data
    await prisma.plaidTransaction.deleteMany({ where: { plaidItemId: testItemId } });
    await prisma.plaidAccount.deleteMany({ where: { plaidItemId: testItemId } });
    await prisma.plaidItem.delete({ where: { id: testItemId } }).catch(() => {});
    await prisma.familyMember.delete({ where: { id: testFamilyMemberId } }).catch(() => {});
    await prisma.userProfile.delete({ where: { id: testUserId } }).catch(() => {});
    await prisma.$disconnect();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    (auth as ClerkAuthMock).mockResolvedValue({ userId: testClerkId });
    (rateLimit as jest.Mock).mockResolvedValue(false); // Not rate limited
  });

  describe('BR-012: Transaction Sync Rate Limiting', () => {
    it('should enforce rate limit (10 per hour)', async () => {
      // Mock rate limit exceeded
      (rateLimit as jest.Mock).mockResolvedValue(true);

      const request = new Request('http://localhost/api/plaid/sync-transactions', {
        method: 'POST',
        body: JSON.stringify({
          itemId: testPlaidItemId,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error).toBe('Too many sync requests');
      expect(data.message).toContain('10 syncs per hour');
      expect(response.headers.get('Retry-After')).toBe('3600');
    });

    it('should allow sync when under rate limit', async () => {
      (rateLimit as jest.Mock).mockResolvedValue(false);

      mockTransactionsSync.mockResolvedValue({
        data: {
          added: [],
          modified: [],
          removed: [],
          has_more: false,
          next_cursor: 'cursor_123',
        },
      });

      mockAccountsBalanceGet.mockResolvedValue({
        data: {
          accounts: [],
        },
      });

      const request = new Request('http://localhost/api/plaid/sync-transactions', {
        method: 'POST',
        body: JSON.stringify({
          itemId: testPlaidItemId,
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(rateLimit).toHaveBeenCalled();
    });
  });

  describe('BR-013: Atomic Transaction Processing', () => {
    it('should add transactions atomically', async () => {
      const txn1Id = 'txn_test_1_' + Date.now();
      const txn2Id = 'txn_test_2_' + Date.now();

      mockTransactionsSync.mockResolvedValue({
        data: {
          added: [
            {
              transaction_id: txn1Id,
              account_id: testAccountId,
              amount: 50.00,
              date: '2024-01-15',
              name: 'Test Transaction 1',
              merchant_name: 'Test Merchant 1',
              category: ['Shopping'],
              pending: false,
              payment_channel: 'online',
              transaction_code: 'purchase',
              personal_finance_category: {
                primary: 'GENERAL_MERCHANDISE',
                detailed: 'GENERAL_MERCHANDISE_OTHER',
              },
            },
            {
              transaction_id: txn2Id,
              account_id: testAccountId,
              amount: 25.00,
              date: '2024-01-16',
              name: 'Test Transaction 2',
              merchant_name: 'Test Merchant 2',
              category: ['Food'],
              pending: false,
              payment_channel: 'in_store',
              transaction_code: 'purchase',
              personal_finance_category: {
                primary: 'FOOD_AND_DRINK',
                detailed: 'FOOD_AND_DRINK_RESTAURANTS',
              },
            },
          ],
          modified: [],
          removed: [],
          has_more: false,
          next_cursor: 'cursor_added',
        },
      });

      mockAccountsBalanceGet.mockResolvedValue({
        data: {
          accounts: [],
        },
      });

      const request = new Request('http://localhost/api/plaid/sync-transactions', {
        method: 'POST',
        body: JSON.stringify({
          itemId: testPlaidItemId,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.added).toBe(2);

      // Verify: Both transactions saved in database
      const savedTxns = await prisma.plaidTransaction.findMany({
        where: {
          transactionId: { in: [txn1Id, txn2Id] },
        },
      });

      expect(savedTxns.length).toBe(2);
      expect(savedTxns[0].amount).toBe(50.00);
      expect(savedTxns[1].amount).toBe(25.00);
    });

    it('should modify transactions atomically', async () => {
      // First: Create existing transaction
      const existingTxnId = 'txn_existing_' + Date.now();
      await prisma.plaidTransaction.create({
        data: {
          transactionId: existingTxnId,
          plaidItemId: testItemId,
          accountId: testAccountId,
          amount: 100.00,
          date: new Date('2024-01-10'),
          name: 'Original Name',
          category: ['Original'],
          pending: true,
        },
      });

      // Second: Modify it via sync
      mockTransactionsSync.mockResolvedValue({
        data: {
          added: [],
          modified: [
            {
              transaction_id: existingTxnId,
              account_id: testAccountId,
              amount: 150.00, // Changed
              date: '2024-01-10',
              name: 'Updated Name', // Changed
              merchant_name: 'Updated Merchant',
              category: ['Updated'], // Changed
              pending: false, // Changed
            },
          ],
          removed: [],
          has_more: false,
          next_cursor: 'cursor_modified',
        },
      });

      mockAccountsBalanceGet.mockResolvedValue({
        data: {
          accounts: [],
        },
      });

      const request = new Request('http://localhost/api/plaid/sync-transactions', {
        method: 'POST',
        body: JSON.stringify({
          itemId: testPlaidItemId,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.modified).toBe(1);

      // Verify: Transaction updated
      const updatedTxn = await prisma.plaidTransaction.findUnique({
        where: { transactionId: existingTxnId },
      });

      expect(updatedTxn).toBeDefined();
      expect(updatedTxn!.amount).toBe(150.00);
      expect(updatedTxn!.name).toBe('Updated Name');
      expect(updatedTxn!.category).toEqual(['Updated']);
      expect(updatedTxn!.pending).toBe(false);
    });

    it('should remove transactions atomically', async () => {
      // First: Create transaction to be removed
      const removedTxnId = 'txn_removed_' + Date.now();
      await prisma.plaidTransaction.create({
        data: {
          transactionId: removedTxnId,
          plaidItemId: testItemId,
          accountId: testAccountId,
          amount: 75.00,
          date: new Date('2024-01-12'),
          name: 'To Be Removed',
          category: ['Test'],
          pending: false,
        },
      });

      // Second: Remove it via sync
      mockTransactionsSync.mockResolvedValue({
        data: {
          added: [],
          modified: [],
          removed: [
            {
              transaction_id: removedTxnId,
            },
          ],
          has_more: false,
          next_cursor: 'cursor_removed',
        },
      });

      mockAccountsBalanceGet.mockResolvedValue({
        data: {
          accounts: [],
        },
      });

      const request = new Request('http://localhost/api/plaid/sync-transactions', {
        method: 'POST',
        body: JSON.stringify({
          itemId: testPlaidItemId,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.removed).toBe(1);

      // Verify: Transaction deleted
      const deletedTxn = await prisma.plaidTransaction.findUnique({
        where: { transactionId: removedTxnId },
      });

      expect(deletedTxn).toBeNull();
    });
  });

  describe('BR-011: Transaction Sync Limits', () => {
    it('should respect max iteration limit (50 iterations)', async () => {
      let callCount = 0;

      // Mock Plaid to return has_more=true for 60 iterations (exceeds limit)
      mockTransactionsSync.mockImplementation(() => {
        callCount++;
        return Promise.resolve({
          data: {
            added: [],
            modified: [],
            removed: [],
            has_more: callCount < 60, // Keep returning true
            next_cursor: `cursor_${callCount}`,
          },
        });
      });

      mockAccountsBalanceGet.mockResolvedValue({
        data: {
          accounts: [],
        },
      });

      const request = new Request('http://localhost/api/plaid/sync-transactions', {
        method: 'POST',
        body: JSON.stringify({
          itemId: testPlaidItemId,
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      // Should stop at 50, not continue to 60
      expect(callCount).toBe(50);
    });

    it('should update cursor after successful sync', async () => {
      const newCursor = 'cursor_updated_' + Date.now();

      mockTransactionsSync.mockResolvedValue({
        data: {
          added: [],
          modified: [],
          removed: [],
          has_more: false,
          next_cursor: newCursor,
        },
      });

      mockAccountsBalanceGet.mockResolvedValue({
        data: {
          accounts: [],
        },
      });

      const request = new Request('http://localhost/api/plaid/sync-transactions', {
        method: 'POST',
        body: JSON.stringify({
          itemId: testPlaidItemId,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.nextCursor).toBe(newCursor);

      // Verify: Cursor saved in database
      const updatedItem = await prisma.plaidItem.findUnique({
        where: { id: testItemId },
      });

      expect(updatedItem).toBeDefined();
      expect(updatedItem!.nextCursor).toBe(newCursor);
      expect(updatedItem!.lastSyncedAt).toBeDefined();
    });
  });

  describe('Balance Updates', () => {
    it('should update account balances after sync', async () => {
      mockTransactionsSync.mockResolvedValue({
        data: {
          added: [],
          modified: [],
          removed: [],
          has_more: false,
          next_cursor: 'cursor_balance',
        },
      });

      mockAccountsBalanceGet.mockResolvedValue({
        data: {
          accounts: [
            {
              account_id: testAccountId,
              name: 'Updated Account Name',
              official_name: 'Updated Official Name',
              mask: '1234',
              type: 'depository',
              subtype: 'checking',
              balances: {
                current: 5000.00,
                available: 4500.00,
                limit: null,
                iso_currency_code: 'USD',
              },
            },
          ],
        },
      });

      const request = new Request('http://localhost/api/plaid/sync-transactions', {
        method: 'POST',
        body: JSON.stringify({
          itemId: testPlaidItemId,
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(200);

      // Verify: Balance updated
      const updatedAccount = await prisma.plaidAccount.findUnique({
        where: { accountId: testAccountId },
      });

      expect(updatedAccount).toBeDefined();
      expect(updatedAccount!.currentBalance).toBe(5000.00);
      expect(updatedAccount!.availableBalance).toBe(4500.00);
      expect(updatedAccount!.name).toBe('Updated Account Name');
    });
  });

  describe('Error Handling', () => {
    it('should return 401 if user not authenticated', async () => {
      (auth as ClerkAuthMock).mockResolvedValue({ userId: null });

      const request = new Request('http://localhost/api/plaid/sync-transactions', {
        method: 'POST',
        body: JSON.stringify({
          itemId: testPlaidItemId,
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(401);
    });

    it('should return 400 if itemId missing', async () => {
      const request = new Request('http://localhost/api/plaid/sync-transactions', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });

    it('should return 404 if item not found', async () => {
      const request = new Request('http://localhost/api/plaid/sync-transactions', {
        method: 'POST',
        body: JSON.stringify({
          itemId: 'nonexistent_item_id',
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(404);
    });

    it('should handle Plaid API errors gracefully', async () => {
      mockTransactionsSync.mockRejectedValue(new Error('ITEM_LOGIN_REQUIRED'));

      mockAccountsBalanceGet.mockResolvedValue({
        data: {
          accounts: [],
        },
      });

      const request = new Request('http://localhost/api/plaid/sync-transactions', {
        method: 'POST',
        body: JSON.stringify({
          itemId: testPlaidItemId,
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(500);
    });
  });
});
