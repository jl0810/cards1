/**
 * @jest-environment node
 * 
 * REAL Integration Test for Transaction Reload (Dump & Reload)
 * 
 * Tests BR-036 - Full Transaction Reload & Data Loss Warning
 * Tests US-022 - Full Transaction Reload
 * 
 * This test uses:
 * - REAL Prisma connection
 * - REAL Vault encryption/decryption
 * - REAL database queries
 * - MOCKED Clerk (external auth service)
 * - MOCKED Plaid API (external service)
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

jest.mock('plaid', () => {
  const mockTransactionsSync = jest.fn();
  return {
    Configuration: jest.fn(),
    PlaidApi: jest.fn().mockImplementation(() => ({
      transactionsSync: mockTransactionsSync,
    })),
    PlaidEnvironments: {
      sandbox: 'https://sandbox.plaid.com',
    },
    __mockTransactionsSync: mockTransactionsSync,
  };
});

jest.mock('@/lib/benefit-matcher', () => ({
  scanAndMatchBenefits: jest.fn().mockResolvedValue(undefined),
}));

import { POST } from '@/app/api/plaid/items/[itemId]/reload-transactions/route';
import { prisma } from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';
import * as plaidModule from 'plaid';

const mockTransactionsSync = (plaidModule as any).__mockTransactionsSync;

describe('REAL Integration: Transaction Reload (US-022, BR-036)', () => {
  let testUserId: string;
  let testClerkId: string;
  let testFamilyMemberId: string;
  let testItemId: string;
  let testSecretId: string;
  let testAccountId: string;

  beforeAll(async () => {
    // Create REAL test data in database
    testClerkId = 'test_reload_' + Date.now();
    const testUser = await prisma.userProfile.create({
      data: {
        clerkId: testClerkId,
        name: 'Test Reload User',
      },
    });
    testUserId = testUser.id;

    const testFamilyMember = await prisma.familyMember.create({
      data: {
        userId: testUserId,
        name: 'Test User',
        isPrimary: true,
      },
    });
    testFamilyMemberId = testFamilyMember.id;

    // Create REAL Vault secret with unique name
    const secretName = `test-reload-item-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const vaultResult = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT vault.create_secret('test-reload-token-' || ${Date.now()}, ${secretName}, 'Integration test') as id;
    `;
    testSecretId = vaultResult[0]?.id;

    if (!testSecretId) {
      throw new Error('Failed to create Vault secret');
    }

    // Create REAL Plaid item
    const testItem = await prisma.plaidItem.create({
      data: {
        userId: testUserId,
        familyMemberId: testFamilyMemberId,
        itemId: 'plaid_reload_' + Date.now(),
        institutionId: 'ins_test',
        institutionName: 'Test Bank',
        accessTokenId: testSecretId,
        status: 'active',
        nextCursor: 'existing_cursor_123',
      },
    });
    testItemId = testItem.id;

    // Create REAL account
    const testAccount = await prisma.plaidAccount.create({
      data: {
        plaidItemId: testItemId,
        familyMemberId: testFamilyMemberId,
        accountId: 'acc_reload_' + Date.now(),
        name: 'Test Checking',
        mask: '1234',
        type: 'depository',
        subtype: 'checking',
        currentBalance: 1000,
      },
    });
    testAccountId = testAccount.accountId;

    // Create some existing transactions
    await prisma.plaidTransaction.create({
      data: {
        plaidItemId: testItemId,
        transactionId: 'txn_old_1',
        accountId: testAccountId,
        amount: 50.0,
        date: new Date('2024-01-01'),
        name: 'Old Transaction 1',
        category: ['Food'],
        pending: false,
      },
    });

    await prisma.plaidTransaction.create({
      data: {
        plaidItemId: testItemId,
        transactionId: 'txn_old_2',
        accountId: testAccountId,
        amount: 75.0,
        date: new Date('2024-01-02'),
        name: 'Old Transaction 2',
        category: ['Shopping'],
        pending: false,
      },
    });
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

  beforeEach(async () => {
    jest.clearAllMocks();
    
    // Recreate test transactions for each test (since reload deletes them)
    await prisma.plaidTransaction.deleteMany({ where: { plaidItemId: testItemId } });
    
    await prisma.plaidTransaction.create({
      data: {
        plaidItemId: testItemId,
        transactionId: 'txn_old_1_' + Date.now(),
        accountId: testAccountId,
        amount: 50.0,
        date: new Date('2024-01-01'),
        name: 'Old Transaction 1',
        category: ['Food'],
        pending: false,
      },
    });

    await prisma.plaidTransaction.create({
      data: {
        plaidItemId: testItemId,
        transactionId: 'txn_old_2_' + Date.now(),
        accountId: testAccountId,
        amount: 75.0,
        date: new Date('2024-01-02'),
        name: 'Old Transaction 2',
        category: ['Shopping'],
        pending: false,
      },
    });
    
    // Reset cursor
    await prisma.plaidItem.update({
      where: { id: testItemId },
      data: { nextCursor: 'existing_cursor_123' },
    });
  });

  it('should require confirmation "RELOAD" (BR-036)', async () => {
    (auth as jest.Mock).mockResolvedValue({ userId: testClerkId });

    const request = new Request(`http://localhost/api/plaid/items/${testItemId}/reload-transactions`, {
      method: 'POST',
      body: JSON.stringify({ confirmation: 'WRONG' }),
    });

    const response = await POST(request, { params: Promise.resolve({ itemId: testItemId }) });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Confirmation required');
  });

  it('should delete all existing transactions and reload from Plaid (BR-036)', async () => {
    (auth as jest.Mock).mockResolvedValue({ userId: testClerkId });

    // Mock Plaid to return new transactions
    mockTransactionsSync.mockResolvedValue({
      data: {
        added: [
          {
            transaction_id: 'txn_new_1',
            account_id: testAccountId,
            amount: 100.0,
            date: '2024-02-01',
            name: 'New Transaction 1',
            merchant_name: 'Test Merchant',
            category: ['Food'],
            pending: false,
            payment_channel: 'online',
          },
          {
            transaction_id: 'txn_new_2',
            account_id: testAccountId,
            amount: 200.0,
            date: '2024-02-02',
            name: 'New Transaction 2',
            merchant_name: null,
            category: ['Shopping'],
            pending: false,
            payment_channel: 'in store',
          },
        ],
        modified: [],
        removed: [],
        has_more: false,
        next_cursor: 'new_cursor_456',
      },
    });

    // Verify we have 2 old transactions
    const oldCount = await prisma.plaidTransaction.count({
      where: { plaidItemId: testItemId },
    });
    expect(oldCount).toBe(2);

    const request = new Request(`http://localhost/api/plaid/items/${testItemId}/reload-transactions`, {
      method: 'POST',
      body: JSON.stringify({ confirmation: 'RELOAD' }),
    });

    const response = await POST(request, { params: Promise.resolve({ itemId: testItemId }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.deletedCount).toBe(2);
    expect(data.reloadedCount).toBe(2);

    // Verify old transactions are gone
    const oldTxn = await prisma.plaidTransaction.findUnique({
      where: { transactionId: 'txn_old_1' },
    });
    expect(oldTxn).toBeNull();

    // Verify new transactions exist
    const newTxn = await prisma.plaidTransaction.findUnique({
      where: { transactionId: 'txn_new_1' },
    });
    expect(newTxn).not.toBeNull();
    expect(newTxn?.amount).toBe(100.0);

    // Verify cursor was updated
    const updatedItem = await prisma.plaidItem.findUnique({ where: { id: testItemId } });
    expect(updatedItem?.nextCursor).toBe('new_cursor_456');
    expect(updatedItem?.lastSyncedAt).not.toBeNull();
  });

  it('should reset cursor to null before fetching (BR-036)', async () => {
    (auth as jest.Mock).mockResolvedValue({ userId: testClerkId });

    mockTransactionsSync.mockResolvedValue({
      data: {
        added: [],
        modified: [],
        removed: [],
        has_more: false,
        next_cursor: 'final_cursor',
      },
    });

    const request = new Request(`http://localhost/api/plaid/items/${testItemId}/reload-transactions`, {
      method: 'POST',
      body: JSON.stringify({ confirmation: 'RELOAD' }),
    });

    await POST(request, { params: Promise.resolve({ itemId: testItemId }) });

    // Verify Plaid was called with cursor=undefined (null converted to undefined)
    expect(mockTransactionsSync).toHaveBeenCalledWith({
      access_token: expect.any(String),
      cursor: undefined,
    });
  });

  it('should return 401 if not authenticated', async () => {
    (auth as jest.Mock).mockResolvedValue({ userId: null });

    const request = new Request(`http://localhost/api/plaid/items/${testItemId}/reload-transactions`, {
      method: 'POST',
      body: JSON.stringify({ confirmation: 'RELOAD' }),
    });

    const response = await POST(request, { params: Promise.resolve({ itemId: testItemId }) });

    expect(response.status).toBe(401);
  });

  it('should return 404 if item not found or not owned', async () => {
    (auth as jest.Mock).mockResolvedValue({ userId: 'wrong_user' });

    const request = new Request(`http://localhost/api/plaid/items/${testItemId}/reload-transactions`, {
      method: 'POST',
      body: JSON.stringify({ confirmation: 'RELOAD' }),
    });

    const response = await POST(request, { params: Promise.resolve({ itemId: testItemId }) });

    expect(response.status).toBe(404);
  });

  it('should handle Plaid API errors gracefully', async () => {
    (auth as jest.Mock).mockResolvedValue({ userId: testClerkId });
    mockTransactionsSync.mockRejectedValue(new Error('Plaid API error'));

    const request = new Request(`http://localhost/api/plaid/items/${testItemId}/reload-transactions`, {
      method: 'POST',
      body: JSON.stringify({ confirmation: 'RELOAD' }),
    });

    const response = await POST(request, { params: Promise.resolve({ itemId: testItemId }) });

    expect(response.status).toBe(500);
  });
});
