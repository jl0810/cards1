/**
 * @jest-environment node
 * 
 * REAL Integration Test for Bank Linking (US-006)
 * 
 * Tests BR-008 (Duplicate Detection), BR-009 (Secure Token Storage), BR-010 (Family Member Assignment)
 * 
 * This test uses:
 * - REAL Prisma connection
 * - REAL Vault encryption
 * - REAL database queries
 * - MOCKED Clerk (external auth service)
 * - MOCKED Plaid API (external service)
 * 
 * @implements BR-008 - Duplicate Detection
 * @implements BR-009 - Secure Token Storage
 * @implements BR-010 - Family Member Assignment
 * @satisfies US-006 - Link Bank Account
 */

// Mock external services BEFORE imports
jest.mock('@/env', () => ({
  env: {
    PLAID_CLIENT_ID: 'test',
    PLAID_SECRET: 'test',
    PLAID_ENV: 'sandbox',
    NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
  },
}));

// Don't mock Clerk - we use real Clerk API for user creation
// Only mock auth() for request authentication
jest.mock('@clerk/nextjs/server', () => {
  const actual = jest.requireActual('@clerk/nextjs/server');
  return {
    ...actual,
    auth: jest.fn(),
  };
});

jest.mock('plaid', () => {
  const mockItemPublicTokenExchange = jest.fn();
  const mockLiabilitiesGet = jest.fn();
  const mockAccountsGet = jest.fn();
  
  return {
    Configuration: jest.fn(),
    PlaidApi: jest.fn().mockImplementation(() => ({
      itemPublicTokenExchange: mockItemPublicTokenExchange,
      liabilitiesGet: mockLiabilitiesGet,
      accountsGet: mockAccountsGet,
    })),
    PlaidEnvironments: {
      sandbox: 'https://sandbox.plaid.com',
    },
    __mockItemPublicTokenExchange: mockItemPublicTokenExchange,
    __mockLiabilitiesGet: mockLiabilitiesGet,
    __mockAccountsGet: mockAccountsGet,
  };
});

// Mock fetch for async transaction sync trigger
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: async () => ({}),
  } as Response)
);

import { POST } from '@/app/api/plaid/exchange-public-token/route';
import { auth } from '@clerk/nextjs/server';
import * as plaidModule from 'plaid';
import { PrismaClient } from '../../../generated/prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { createTestUserViaClerk, cleanupTestUser, type TestUserData } from '@/__tests__/lib/test-user-helper';

const mockItemPublicTokenExchange = (plaidModule as any).__mockItemPublicTokenExchange;
const mockLiabilitiesGet = (plaidModule as any).__mockLiabilitiesGet;
const mockAccountsGet = (plaidModule as any).__mockAccountsGet;

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

describeIf('REAL Integration: Bank Linking (US-006)', () => {
  let testUser: TestUserData;

  beforeAll(async () => {
    // Create test user through Clerk API (proper way - respects BR-001)
    testUser = await createTestUserViaClerk({
      firstName: 'Test',
      lastName: 'User',
    });
  });

  afterAll(async () => {
    // CRITICAL: Cleanup test user from Clerk and database
    if (testUser?.clerkId) {
      await cleanupTestUser(testUser.clerkId);
    }
    await prisma.$disconnect();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    (auth as jest.Mock).mockResolvedValue({ userId: testUser.clerkId });
  });

  describe('BR-009: Secure Token Storage', () => {
    it('should encrypt access token in Vault (not plain text in DB)', async () => {
      // Mock Plaid responses
      mockItemPublicTokenExchange.mockResolvedValue({
        data: {
          access_token: 'access-test-token-' + Date.now(),
          item_id: 'item_test_' + Date.now(),
        },
      });

      mockLiabilitiesGet.mockResolvedValue({
        data: {
          accounts: [
            {
              account_id: 'acc_test_1',
              name: 'Test Checking',
              mask: '1234',
              type: 'depository',
              subtype: 'checking',
              balances: {
                current: 1000,
                available: 950,
                limit: null,
                iso_currency_code: 'USD',
              },
            },
          ],
          liabilities: { credit: [] },
        },
      });

      const request = new Request('http://localhost/api/plaid/exchange-public-token', {
        method: 'POST',
        body: JSON.stringify({
          public_token: 'public-test-token',
          metadata: {
            institution: {
              institution_id: 'ins_test_vault',
              name: 'Test Bank',
            },
            accounts: [
              {
                mask: '1234',
                subtype: 'checking',
              },
            ],
          },
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.ok).toBe(true);
      expect(data.itemId).toBeDefined();

      // Verify: Token NOT in plain text in database
      const plaidItem = await prisma.plaidItem.findUnique({
        where: { id: data.itemId },
      });

      expect(plaidItem).toBeDefined();
      expect(plaidItem!.accessTokenId).toBeDefined();
      // accessTokenId should be a UUID, not the actual token
      expect(plaidItem!.accessTokenId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
      expect(plaidItem!.accessTokenId).not.toContain('access-test-token');

      // Verify: Can decrypt token from Vault
      const vaultResult = await prisma.$queryRaw<Array<{ decrypted_secret: string }>>`
        SELECT decrypted_secret FROM vault.decrypted_secrets WHERE id = ${plaidItem!.accessTokenId}::uuid;
      `;

      expect(vaultResult).toBeDefined();
      expect(vaultResult.length).toBe(1);
      expect(vaultResult[0].decrypted_secret).toContain('access-test-token');
    });

    // NOTE: Rollback behavior testing removed from integration tests
    // Mocking prisma.$queryRaw in integration tests breaks the test isolation
    // and affects subsequent tests. Rollback behavior should be tested at the
    // unit test level with proper mocking, not in integration tests that use
    // a real database and real Vault.
  });

  describe('BR-008: Duplicate Detection', () => {
    it('should detect duplicate bank connection and return existing itemId', async () => {
      const institutionId = 'ins_test_duplicate_' + Date.now();
      const itemId = 'item_test_duplicate_' + Date.now();
      const accessToken = 'access-test-duplicate-' + Date.now();

      // First: Create existing item with Vault token
      const vaultResult = await prisma.$queryRaw<Array<{ id: string }>>`
        SELECT vault.create_secret(${accessToken}, ${itemId}, 'Test duplicate') as id;
      `;
      const secretId = vaultResult[0]?.id;

      const existingItem = await prisma.plaidItem.create({
        data: {
          userId: testUser.userId,
          familyMemberId: testUser.familyMemberId,
          itemId: itemId,
          institutionId: institutionId,
          institutionName: 'Test Bank Duplicate',
          accessTokenId: secretId,
          accounts: {
            create: {
              accountId: 'acc_duplicate_1',
              name: 'Existing Account',
              mask: '5678',
              type: 'depository',
              subtype: 'checking',
              familyMemberId: testUser.familyMemberId,
            },
          },
        },
      });

      // Second: Try to link same bank again
      const request = new Request('http://localhost/api/plaid/exchange-public-token', {
        method: 'POST',
        body: JSON.stringify({
          public_token: 'public-test-duplicate',
          metadata: {
            institution: {
              institution_id: institutionId,
              name: 'Test Bank Duplicate',
            },
            accounts: [
              {
                mask: '5678',
                subtype: 'checking',
              },
            ],
          },
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      // Verify: Returns existing item, no new token exchange
      expect(response.status).toBe(200);
      expect(data.ok).toBe(true);
      expect(data.duplicate).toBe(true);
      expect(data.itemId).toBe(existingItem.id);
      expect(mockItemPublicTokenExchange).not.toHaveBeenCalled();
    });

    it('should allow linking different accounts from same institution', async () => {
      const institutionId = 'ins_test_different_' + Date.now();
      const itemId1 = 'item_test_different_1_' + Date.now();
      const accessToken1 = 'access-test-different-1-' + Date.now();

      // First: Create existing item with different account
      const vaultResult1 = await prisma.$queryRaw<Array<{ id: string }>>`
        SELECT vault.create_secret(${accessToken1}, ${itemId1}, 'Test different 1') as id;
      `;
      const secretId1 = vaultResult1[0]?.id;

      await prisma.plaidItem.create({
        data: {
          userId: testUser.userId,
          familyMemberId: testUser.familyMemberId,
          itemId: itemId1,
          institutionId: institutionId,
          institutionName: 'Test Bank Different',
          accessTokenId: secretId1,
          accounts: {
            create: {
              accountId: 'acc_different_1',
              name: 'Account 1',
              mask: '1111',
              type: 'depository',
              subtype: 'checking',
              familyMemberId: testUser.familyMemberId,
            },
          },
        },
      });

      // Second: Link different account from same institution
      const itemId2 = 'item_test_different_2_' + Date.now();
      const accessToken2 = 'access-test-different-2-' + Date.now();

      mockItemPublicTokenExchange.mockResolvedValue({
        data: {
          access_token: accessToken2,
          item_id: itemId2,
        },
      });

      mockLiabilitiesGet.mockResolvedValue({
        data: {
          accounts: [
            {
              account_id: 'acc_different_2',
              name: 'Account 2',
              mask: '2222',
              type: 'depository',
              subtype: 'savings',
              balances: {
                current: 5000,
                available: 5000,
                limit: null,
                iso_currency_code: 'USD',
              },
            },
          ],
          liabilities: { credit: [] },
        },
      });

      const request = new Request('http://localhost/api/plaid/exchange-public-token', {
        method: 'POST',
        body: JSON.stringify({
          public_token: 'public-test-different',
          metadata: {
            institution: {
              institution_id: institutionId,
              name: 'Test Bank Different',
            },
            accounts: [
              {
                mask: '2222',
                subtype: 'savings',
              },
            ],
          },
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      // Verify: Creates new item (different account)
      expect(response.status).toBe(200);
      expect(data.ok).toBe(true);
      expect(data.duplicate).toBeUndefined();
      expect(mockItemPublicTokenExchange).toHaveBeenCalled();
    });
  });

  describe('BR-010: Family Member Assignment', () => {
    it('should assign to primary member if no familyMemberId specified', async () => {
      const itemId = 'item_test_primary_' + Date.now();
      const accessToken = 'access-test-primary-' + Date.now();

      mockItemPublicTokenExchange.mockResolvedValue({
        data: {
          access_token: accessToken,
          item_id: itemId,
        },
      });

      mockLiabilitiesGet.mockResolvedValue({
        data: {
          accounts: [
            {
              account_id: 'acc_primary_1',
              name: 'Primary Account',
              mask: '9999',
              type: 'depository',
              subtype: 'checking',
              balances: {
                current: 2000,
                available: 1800,
                limit: null,
                iso_currency_code: 'USD',
              },
            },
          ],
          liabilities: { credit: [] },
        },
      });

      const request = new Request('http://localhost/api/plaid/exchange-public-token', {
        method: 'POST',
        body: JSON.stringify({
          public_token: 'public-test-primary',
          metadata: {
            institution: {
              institution_id: 'ins_test_primary',
              name: 'Test Bank Primary',
            },
            accounts: [
              {
                mask: '9999',
                subtype: 'checking',
              },
            ],
          },
          // No familyMemberId specified
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.ok).toBe(true);

      // Verify: Assigned to primary member
      const plaidItem = await prisma.plaidItem.findUnique({
        where: { id: data.itemId },
        include: { familyMember: true },
      });

      expect(plaidItem).toBeDefined();
      expect(plaidItem!.familyMemberId).toBe(testUser.familyMemberId);
      expect(plaidItem!.familyMember.isPrimary).toBe(true);
    });

    it('should assign to specified family member', async () => {
      // Create secondary family member
      const secondaryMember = await prisma.familyMember.create({
        data: {
          userId: testUser.userId,
          name: 'Secondary Member',
          isPrimary: false,
        },
      });

      const itemId = 'item_test_secondary_' + Date.now();
      const accessToken = 'access-test-secondary-' + Date.now();

      mockItemPublicTokenExchange.mockResolvedValue({
        data: {
          access_token: accessToken,
          item_id: itemId,
        },
      });

      mockLiabilitiesGet.mockResolvedValue({
        data: {
          accounts: [
            {
              account_id: 'acc_secondary_1',
              name: 'Secondary Account',
              mask: '8888',
              type: 'depository',
              subtype: 'checking',
              balances: {
                current: 3000,
                available: 2800,
                limit: null,
                iso_currency_code: 'USD',
              },
            },
          ],
          liabilities: { credit: [] },
        },
      });

      const request = new Request('http://localhost/api/plaid/exchange-public-token', {
        method: 'POST',
        body: JSON.stringify({
          public_token: 'public-test-secondary',
          metadata: {
            institution: {
              institution_id: 'ins_test_secondary',
              name: 'Test Bank Secondary',
            },
            accounts: [
              {
                mask: '8888',
                subtype: 'checking',
              },
            ],
          },
          familyMemberId: secondaryMember.id,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.ok).toBe(true);

      // Verify: Assigned to secondary member
      const plaidItem = await prisma.plaidItem.findUnique({
        where: { id: data.itemId },
        include: { familyMember: true },
      });

      expect(plaidItem).toBeDefined();
      expect(plaidItem!.familyMemberId).toBe(secondaryMember.id);
      expect(plaidItem!.familyMember.isPrimary).toBe(false);
      expect(plaidItem!.familyMember.name).toBe('Secondary Member');
    });
  });

  describe('Error Handling', () => {
    it('should return 401 if user not authenticated', async () => {
      (auth as jest.Mock).mockResolvedValue({ userId: null });

      const request = new Request('http://localhost/api/plaid/exchange-public-token', {
        method: 'POST',
        body: JSON.stringify({
          public_token: 'public-test-unauth',
          metadata: {},
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(401);
    });

    it('should return 404 if user profile not found', async () => {
      (auth as jest.Mock).mockResolvedValue({ userId: 'nonexistent_clerk_id' });

      const request = new Request('http://localhost/api/plaid/exchange-public-token', {
        method: 'POST',
        body: JSON.stringify({
          public_token: 'public-test-notfound',
          metadata: {},
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(404);
    });

    it('should handle Plaid API errors gracefully', async () => {
      mockItemPublicTokenExchange.mockRejectedValue(new Error('INVALID_PUBLIC_TOKEN'));

      const request = new Request('http://localhost/api/plaid/exchange-public-token', {
        method: 'POST',
        body: JSON.stringify({
          public_token: 'public-test-invalid',
          metadata: {
            institution: {
              institution_id: 'ins_test_error',
              name: 'Test Bank Error',
            },
            accounts: [],
          },
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(500);
    });
  });
});
