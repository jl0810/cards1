/**
 * @jest-environment node
 */

import { POST } from '@/app/api/plaid/exchange-public-token/route';
import { prisma } from '@/lib/prisma';
import { plaidClient } from '@/lib/plaid';

// Mock dependencies
jest.mock('@clerk/nextjs/server');
jest.mock('@/lib/plaid');
jest.mock('@/lib/prisma', () => ({
  prisma: {
    userProfile: {
      findUnique: jest.fn(),
    },
    familyMember: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    plaidItem: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    $queryRaw: jest.fn(),
  },
}));
jest.mock('@/lib/plaid-bank');

const { auth } = require('@clerk/nextjs/server');
const { ensureBankExists } = require('@/lib/plaid-bank');

global.fetch = jest.fn();

/**
 * US-006: Link Bank Account Integration Tests
 * Tests BR-008 (Duplicate Detection), BR-009 (Vault Storage), BR-010 (Family Assignment)
 * 
 * @implements BR-008 - Duplicate item detection
 * @implements BR-009 - Secure token storage in Vault
 * @implements BR-010 - Family member assignment
 * @satisfies US-006 - Link Bank Account
 */
describe('US-006: Link Bank Account', () => {
  const mockUserId = 'user_123';
  const mockUserProfile = {
    id: 'profile_123',
    clerkId: mockUserId,
    name: 'Test User',
    avatar: null,
  };
  const mockFamilyMember = {
    id: 'family_123',
    userId: mockUserProfile.id,
    name: 'Test User',
    role: 'Primary',
  };
  const mockPublicToken = 'public-sandbox-test-token';
  const mockAccessToken = 'access-sandbox-test-token';
  const mockItemId = 'item_test_123';
  const mockInstitutionId = 'ins_109508';
  const mockSecretId = 'secret_uuid_123';

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default auth mock
    (auth as jest.Mock).mockResolvedValue({ userId: mockUserId });
    
    // Default Prisma mocks
    (prisma.userProfile.findUnique as jest.Mock).mockResolvedValue(mockUserProfile);
    (prisma.familyMember.findFirst as jest.Mock).mockResolvedValue(mockFamilyMember);
    (prisma.familyMember.create as jest.Mock).mockResolvedValue(mockFamilyMember);
    (prisma.plaidItem.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.$queryRaw as jest.Mock).mockResolvedValue([{ id: mockSecretId }]);
    
    // Default Plaid mocks
    (plaidClient.itemPublicTokenExchange as jest.Mock).mockResolvedValue({
      data: {
        access_token: mockAccessToken,
        item_id: mockItemId,
      },
    });
    (plaidClient.liabilitiesGet as jest.Mock).mockResolvedValue({
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
              current: 1500.00,
              available: 8500.00,
              limit: 10000.00,
              iso_currency_code: 'USD',
            },
          },
        ],
        liabilities: {
          credit: [
            {
              account_id: 'acc_123',
              aprs: [{ apr_type: 'purchase_apr', apr_percentage: 19.99 }],
              minimum_payment_amount: 35.00,
              last_statement_balance: 1500.00,
              next_payment_due_date: '2025-12-15',
              last_statement_issue_date: '2025-11-15',
            },
          ],
        },
      },
    });
    (plaidClient.accountsGet as jest.Mock).mockResolvedValue({
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
              current: 1500.00,
              available: 8500.00,
              limit: 10000.00,
              iso_currency_code: 'USD',
            },
          },
        ],
      },
    });
    
    (prisma.plaidItem.create as jest.Mock).mockResolvedValue({
      id: 'db_item_123',
      userId: mockUserProfile.id,
      familyMemberId: mockFamilyMember.id,
      itemId: mockItemId,
      accessTokenId: mockSecretId,
      institutionId: mockInstitutionId,
      institutionName: 'Chase',
    });
    
    (ensureBankExists as jest.Mock).mockResolvedValue(undefined);
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true });
  });

  describe('BR-008: Duplicate Detection', () => {
    it('should detect duplicate bank connection and return existing itemId', async () => {
      // Setup: Existing item with matching account
      const existingItem = {
        id: 'existing_item_123',
        institutionId: mockInstitutionId,
        accounts: [
          { mask: '1234', subtype: 'credit card' },
        ],
      };
      (prisma.plaidItem.findFirst as jest.Mock).mockResolvedValue(existingItem);

      const request = new Request('http://localhost/api/plaid/exchange-public-token', {
        method: 'POST',
        body: JSON.stringify({
          public_token: mockPublicToken,
          metadata: {
            institution: {
              institution_id: mockInstitutionId,
              name: 'Chase',
            },
            accounts: [
              { mask: '1234', subtype: 'credit card' },
            ],
          },
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      // Should NOT exchange token
      expect(plaidClient.itemPublicTokenExchange).not.toHaveBeenCalled();
      
      // Should return existing item
      expect(data).toEqual({
        ok: true,
        itemId: 'existing_item_123',
        duplicate: true,
      });
      
      console.log('✅ BR-008: Duplicate detection prevents re-linking same bank');
    });

    it('should allow linking if institution matches but accounts differ', async () => {
      // Setup: Existing item with DIFFERENT account
      const existingItem = {
        id: 'existing_item_123',
        institutionId: mockInstitutionId,
        accounts: [
          { mask: '5678', subtype: 'checking' }, // Different account
        ],
      };
      (prisma.plaidItem.findFirst as jest.Mock).mockResolvedValue(existingItem);

      const request = new Request('http://localhost/api/plaid/exchange-public-token', {
        method: 'POST',
        body: JSON.stringify({
          public_token: mockPublicToken,
          metadata: {
            institution: {
              institution_id: mockInstitutionId,
              name: 'Chase',
            },
            accounts: [
              { mask: '1234', subtype: 'credit card' }, // New account
            ],
          },
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      // SHOULD exchange token (different account)
      expect(plaidClient.itemPublicTokenExchange).toHaveBeenCalledWith({
        public_token: mockPublicToken,
      });
      
      expect(data.ok).toBe(true);
      expect(data.duplicate).toBeUndefined();
      
      console.log('✅ BR-008: Allows linking different accounts from same institution');
    });
  });

  describe('BR-009: Secure Token Storage in Vault', () => {
    it('should encrypt access token in Supabase Vault', async () => {
      const request = new Request('http://localhost/api/plaid/exchange-public-token', {
        method: 'POST',
        body: JSON.stringify({
          public_token: mockPublicToken,
          metadata: {
            institution: {
              institution_id: mockInstitutionId,
              name: 'Chase',
            },
            accounts: [],
          },
        }),
      });

      await POST(request);

      // Verify Vault storage was called
      expect(prisma.$queryRaw).toHaveBeenCalled();
      
      // Verify vault.create_secret was called (template literal parts are in array)
      const vaultCall = (prisma.$queryRaw as jest.Mock).mock.calls[0];
      expect(vaultCall).toBeDefined();
      const sqlParts = vaultCall[0];
      expect(sqlParts.join('')).toContain('vault.create_secret');
      
      console.log('✅ BR-009: Access token encrypted in Vault');
    });

    it('should fail if Vault storage returns no secretId', async () => {
      // Mock Vault failure
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([]);

      const request = new Request('http://localhost/api/plaid/exchange-public-token', {
        method: 'POST',
        body: JSON.stringify({
          public_token: mockPublicToken,
          metadata: {
            institution: {
              institution_id: mockInstitutionId,
              name: 'Chase',
            },
            accounts: [],
          },
        }),
      });

      const response = await POST(request);
      
      expect(response.status).toBe(500);
      
      console.log('✅ BR-009: Fails gracefully when Vault storage fails');
    });

    it('should store secretId in PlaidItem.accessTokenId field', async () => {
      const request = new Request('http://localhost/api/plaid/exchange-public-token', {
        method: 'POST',
        body: JSON.stringify({
          public_token: mockPublicToken,
          metadata: {
            institution: {
              institution_id: mockInstitutionId,
              name: 'Chase',
            },
            accounts: [],
          },
        }),
      });

      await POST(request);

      // Verify PlaidItem was created with secretId
      expect(prisma.plaidItem.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            accessTokenId: mockSecretId,
          }),
        })
      );
      
      console.log('✅ BR-009: Secret ID stored in database (not plain token)');
    });
  });

  describe('BR-010: Family Member Assignment', () => {
    it('should assign to specified family member if provided', async () => {
      const customFamilyMember = {
        id: 'family_custom_123',
        userId: mockUserProfile.id,
        name: 'Spouse',
        role: 'Member',
      };
      (prisma.familyMember.findFirst as jest.Mock).mockResolvedValue(customFamilyMember);

      const request = new Request('http://localhost/api/plaid/exchange-public-token', {
        method: 'POST',
        body: JSON.stringify({
          public_token: mockPublicToken,
          familyMemberId: 'family_custom_123',
          metadata: {
            institution: {
              institution_id: mockInstitutionId,
              name: 'Chase',
            },
            accounts: [],
          },
        }),
      });

      await POST(request);

      // Verify custom family member was used
      expect(prisma.plaidItem.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            familyMemberId: 'family_custom_123',
          }),
        })
      );
      
      console.log('✅ BR-010: Assigns to specified family member');
    });

    it('should default to primary family member if not specified', async () => {
      const request = new Request('http://localhost/api/plaid/exchange-public-token', {
        method: 'POST',
        body: JSON.stringify({
          public_token: mockPublicToken,
          // NO familyMemberId provided
          metadata: {
            institution: {
              institution_id: mockInstitutionId,
              name: 'Chase',
            },
            accounts: [],
          },
        }),
      });

      await POST(request);

      // Verify primary family member was used
      expect(prisma.plaidItem.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            familyMemberId: mockFamilyMember.id,
          }),
        })
      );
      
      console.log('✅ BR-010: Defaults to primary family member');
    });

    it('should assign all accounts to the same family member', async () => {
      const request = new Request('http://localhost/api/plaid/exchange-public-token', {
        method: 'POST',
        body: JSON.stringify({
          public_token: mockPublicToken,
          metadata: {
            institution: {
              institution_id: mockInstitutionId,
              name: 'Chase',
            },
            accounts: [],
          },
        }),
      });

      await POST(request);

      // Verify all accounts have same familyMemberId
      const createCall = (prisma.plaidItem.create as jest.Mock).mock.calls[0][0];
      const accounts = createCall.data.accounts.create;
      
      accounts.forEach((account: any) => {
        expect(account.familyMemberId).toBe(mockFamilyMember.id);
      });
      
      console.log('✅ BR-010: All accounts assigned to same family member');
    });
  });

  describe('Integration: Complete Flow', () => {
    it('should complete full bank linking flow successfully', async () => {
      const request = new Request('http://localhost/api/plaid/exchange-public-token', {
        method: 'POST',
        body: JSON.stringify({
          public_token: mockPublicToken,
          metadata: {
            institution: {
              institution_id: mockInstitutionId,
              name: 'Chase',
            },
            accounts: [
              { mask: '1234', subtype: 'credit card' },
            ],
          },
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      // Verify complete flow
      expect(auth).toHaveBeenCalled();
      expect(prisma.userProfile.findUnique).toHaveBeenCalled();
      expect(prisma.plaidItem.findFirst).toHaveBeenCalled(); // Duplicate check
      expect(plaidClient.itemPublicTokenExchange).toHaveBeenCalled();
      expect(plaidClient.liabilitiesGet).toHaveBeenCalled();
      expect(prisma.$queryRaw).toHaveBeenCalled(); // Vault storage
      expect(prisma.plaidItem.create).toHaveBeenCalled();
      expect(ensureBankExists).toHaveBeenCalled();
      expect(global.fetch).toHaveBeenCalled(); // Transaction sync trigger
      
      expect(data.ok).toBe(true);
      expect(data.itemId).toBeDefined();
      
      console.log('✅ US-006: Complete bank linking flow works end-to-end');
    });

    it('should handle liabilities fetch failure gracefully', async () => {
      // Mock liabilities failure, fallback to accountsGet
      (plaidClient.liabilitiesGet as jest.Mock).mockRejectedValue(new Error('Liabilities not available'));

      const request = new Request('http://localhost/api/plaid/exchange-public-token', {
        method: 'POST',
        body: JSON.stringify({
          public_token: mockPublicToken,
          metadata: {
            institution: {
              institution_id: mockInstitutionId,
              name: 'Chase',
            },
            accounts: [],
          },
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      // Should fallback to accountsGet
      expect(plaidClient.accountsGet).toHaveBeenCalled();
      expect(data.ok).toBe(true);
      
      console.log('✅ US-006: Falls back to accountsGet if liabilities unavailable');
    });
  });

  describe('Error Handling', () => {
    it('should return 401 if user not authenticated', async () => {
      (auth as jest.Mock).mockResolvedValue({ userId: null });

      const request = new Request('http://localhost/api/plaid/exchange-public-token', {
        method: 'POST',
        body: JSON.stringify({
          public_token: mockPublicToken,
          metadata: {},
        }),
      });

      const response = await POST(request);
      
      expect(response.status).toBe(401);
      
      console.log('✅ Returns 401 for unauthenticated requests');
    });

    it('should return 404 if user profile not found', async () => {
      (prisma.userProfile.findUnique as jest.Mock).mockResolvedValue(null);

      const request = new Request('http://localhost/api/plaid/exchange-public-token', {
        method: 'POST',
        body: JSON.stringify({
          public_token: mockPublicToken,
          metadata: {},
        }),
      });

      const response = await POST(request);
      
      expect(response.status).toBe(404);
      
      console.log('✅ Returns 404 if user profile missing');
    });
  });
});
