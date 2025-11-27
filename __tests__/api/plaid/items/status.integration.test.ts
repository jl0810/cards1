/**
 * @jest-environment node
 * 
 * REAL Integration Test for Plaid Item Status
 * 
 * This test uses:
 * - REAL Prisma connection
 * - REAL Vault encryption/decryption
 * - REAL database queries
 * - MOCKED Clerk (external auth service)
 * - MOCKED Plaid API (external service)
 * 
 * If this test passes, the code ACTUALLY WORKS.
 * If this test fails, there's a REAL BUG.
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
  // Use a factory function to access mockItemGet
  const mockItemGetFn = jest.fn();
  return {
    Configuration: jest.fn(),
    PlaidApi: jest.fn().mockImplementation(() => ({
      itemGet: mockItemGetFn,
    })),
    PlaidEnvironments: {
      sandbox: 'https://sandbox.plaid.com',
    },
    // Export the mock so we can access it in tests
    __mockItemGet: mockItemGetFn,
  };
});

import { GET } from '@/app/api/plaid/items/[itemId]/status/route';
import { prisma } from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';
import * as plaidModule from 'plaid';

// Get the mock function from the mocked module
const mockItemGetFn = (plaidModule as any).__mockItemGet;

describe('REAL Integration: Plaid Item Status', () => {
  let testUserId: string;
  let testFamilyMemberId: string;
  let testItemId: string;
  let testSecretId: string;

  beforeAll(async () => {
    // Create REAL test data in database
    const testUser = await prisma.userProfile.create({
      data: {
        clerkId: 'test_clerk_' + Date.now(),
        name: 'Test User',
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

    // Create REAL Vault secret
    const vaultResult = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT vault.create_secret('test-access-token-' || ${Date.now()}, 'Test Item', 'Integration test') as id;
    `;
    testSecretId = vaultResult[0]?.id;

    if (!testSecretId) {
      throw new Error('Failed to create Vault secret - Vault not working!');
    }

    // Create REAL Plaid item
    const testItem = await prisma.plaidItem.create({
      data: {
        userId: testUserId,
        familyMemberId: testFamilyMemberId,
        itemId: 'plaid_item_' + Date.now(),
        institutionId: 'ins_test',
        institutionName: 'Test Bank',
        accessTokenId: testSecretId,
        status: 'active',
      },
    });
    testItemId = testItem.id;
  });

  afterAll(async () => {
    // Cleanup REAL data
    if (testItemId) {
      await prisma.plaidItem.delete({ where: { id: testItemId } }).catch(() => {});
    }
    if (testFamilyMemberId) {
      await prisma.familyMember.delete({ where: { id: testFamilyMemberId } }).catch(() => {});
    }
    if (testUserId) {
      await prisma.userProfile.delete({ where: { id: testUserId } }).catch(() => {});
    }
    // Note: Vault secrets are append-only, can't delete
    await prisma.$disconnect();
  });

  it('should retrieve token from REAL Vault and call Plaid', async () => {
    // Mock external services only
    (auth as jest.Mock).mockResolvedValue({ userId: 'test_clerk_' + testUserId });
    mockItemGetFn.mockResolvedValue({
      data: {
        item: {
          institution_id: 'ins_test',
          error: null,
        },
      },
    });

    const request = new Request(`http://localhost/api/plaid/items/${testItemId}/status`);
    const params = Promise.resolve({ itemId: testItemId });

    const response = await GET(request, { params });
    const data = await response.json();

    // Verify it worked
    expect(response.status).toBe(200);
    expect(data.status).toBe('active');
    
    // Verify Plaid was called with REAL token from Vault
    expect(mockItemGetFn).toHaveBeenCalled();
    const plaidCall = mockItemGetFn.mock.calls[0][0];
    expect(plaidCall.access_token).toMatch(/^test-access-token-/);
  });

  it('should fail if Vault secret does not exist', async () => {
    (auth as jest.Mock).mockResolvedValue({ userId: 'test_clerk_' + testUserId });

    // Create item with non-existent secret ID
    const badItem = await prisma.plaidItem.create({
      data: {
        userId: testUserId,
        familyMemberId: testFamilyMemberId,
        itemId: 'bad_item_' + Date.now(),
        institutionId: 'ins_test',
        institutionName: 'Test Bank',
        accessTokenId: '00000000-0000-0000-0000-000000000000', // Doesn't exist
        status: 'active',
      },
    });

    const request = new Request(`http://localhost/api/plaid/items/${badItem.id}/status`);
    const params = Promise.resolve({ itemId: badItem.id });

    const response = await GET(request, { params });

    expect(response.status).toBe(404);

    await prisma.plaidItem.delete({ where: { id: badItem.id } });
  });

  it('should detect needs_reauth status (BR-033)', async () => {
    (auth as jest.Mock).mockResolvedValue({ userId: 'test_clerk_' + testUserId });
    mockItemGetFn.mockResolvedValue({
      data: {
        item: {
          institution_id: 'ins_test',
          error: {
            error_code: 'ITEM_LOGIN_REQUIRED',
            error_message: 'User needs to re-authenticate',
          },
        },
      },
    });

    const request = new Request(`http://localhost/api/plaid/items/${testItemId}/status`);
    const params = Promise.resolve({ itemId: testItemId });

    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe('needs_reauth');
    expect(data.error.error_code).toBe('ITEM_LOGIN_REQUIRED');

    // Verify database was updated
    const updatedItem = await prisma.plaidItem.findUnique({ where: { id: testItemId } });
    expect(updatedItem?.status).toBe('needs_reauth');
  });

  it('should detect error status for other Plaid errors (BR-033)', async () => {
    (auth as jest.Mock).mockResolvedValue({ userId: 'test_clerk_' + testUserId });
    mockItemGetFn.mockResolvedValue({
      data: {
        item: {
          institution_id: 'ins_test',
          error: {
            error_code: 'INSTITUTION_DOWN',
            error_message: 'Institution is temporarily unavailable',
          },
        },
      },
    });

    const request = new Request(`http://localhost/api/plaid/items/${testItemId}/status`);
    const params = Promise.resolve({ itemId: testItemId });

    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe('error');
    expect(data.error.error_code).toBe('INSTITUTION_DOWN');
  });

  it('should update lastSyncedAt timestamp (BR-033)', async () => {
    (auth as jest.Mock).mockResolvedValue({ userId: 'test_clerk_' + testUserId });
    mockItemGetFn.mockResolvedValue({
      data: {
        item: {
          institution_id: 'ins_test',
          error: null,
        },
      },
    });

    const beforeTime = new Date();
    
    const request = new Request(`http://localhost/api/plaid/items/${testItemId}/status`);
    const params = Promise.resolve({ itemId: testItemId });

    await GET(request, { params });

    const updatedItem = await prisma.plaidItem.findUnique({ where: { id: testItemId } });
    expect(updatedItem?.lastSyncedAt).toBeDefined();
    expect(updatedItem?.lastSyncedAt!.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
  });

  it('should return 401 if not authenticated', async () => {
    (auth as jest.Mock).mockResolvedValue({ userId: null });

    const request = new Request(`http://localhost/api/plaid/items/${testItemId}/status`);
    const params = Promise.resolve({ itemId: testItemId });

    const response = await GET(request, { params });

    expect(response.status).toBe(401);
  });

  it('should return 404 if user profile not found', async () => {
    (auth as jest.Mock).mockResolvedValue({ userId: 'nonexistent_user' });

    const request = new Request(`http://localhost/api/plaid/items/${testItemId}/status`);
    const params = Promise.resolve({ itemId: testItemId });

    const response = await GET(request, { params });

    expect(response.status).toBe(404);
  });

  it('should return 404 if item belongs to different user', async () => {
    // Create another user
    const otherUser = await prisma.userProfile.create({
      data: {
        clerkId: 'other_clerk_' + Date.now(),
        name: 'Other User',
      },
    });

    (auth as jest.Mock).mockResolvedValue({ userId: otherUser.clerkId });

    const request = new Request(`http://localhost/api/plaid/items/${testItemId}/status`);
    const params = Promise.resolve({ itemId: testItemId });

    const response = await GET(request, { params });

    expect(response.status).toBe(404);

    await prisma.userProfile.delete({ where: { id: otherUser.id } });
  });

  it('should include consent expiration time if available', async () => {
    (auth as jest.Mock).mockResolvedValue({ userId: 'test_clerk_' + testUserId });
    const expirationTime = '2025-12-31T23:59:59Z';
    mockItemGetFn.mockResolvedValue({
      data: {
        item: {
          institution_id: 'ins_test',
          error: null,
          consent_expiration_time: expirationTime,
        },
      },
    });

    const request = new Request(`http://localhost/api/plaid/items/${testItemId}/status`);
    const params = Promise.resolve({ itemId: testItemId });

    const response = await GET(request, { params });
    const data = await response.json();

    expect(data.consentExpirationTime).toBe(expirationTime);
  });

  it('should handle Plaid API errors gracefully', async () => {
    (auth as jest.Mock).mockResolvedValue({ userId: 'test_clerk_' + testUserId });
    mockItemGetFn.mockRejectedValue(new Error('Plaid API timeout'));

    const request = new Request(`http://localhost/api/plaid/items/${testItemId}/status`);
    const params = Promise.resolve({ itemId: testItemId });

    const response = await GET(request, { params });

    expect(response.status).toBe(500);
  });
});
