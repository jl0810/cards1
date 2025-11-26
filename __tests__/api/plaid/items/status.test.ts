/**
 * Tests for Plaid Item Status/Health Check API
 * 
 * Tests BR-033 (Connection Health Monitoring) for US-020
 * Verifies status detection, ITEM_LOGIN_REQUIRED handling, and database updates
 * 
 * @implements BR-033 - Connection Health Monitoring
 * @satisfies US-020 - Monitor Bank Connection Health
 */

import { GET } from '@/app/api/plaid/items/[itemId]/status/route';
import { prisma } from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';

// Mock dependencies
jest.mock('@clerk/nextjs/server', () => ({
    auth: jest.fn(),
}));

jest.mock('@/lib/prisma', () => ({
    prisma: {
        userProfile: {
            findUnique: jest.fn(),
        },
        plaidItem: {
            findFirst: jest.fn(),
            update: jest.fn(),
        },
        $queryRaw: jest.fn(),
    },
}));

// Mock fetch for Vault access
global.fetch = jest.fn();

// Mock Plaid client - itemGet will be mocked per test
const mockItemGetImpl = jest.fn();

jest.mock('plaid', () => {
    return {
        Configuration: jest.fn(),
        PlaidApi: jest.fn().mockImplementation(() => ({
            itemGet: (...args: any[]) => mockItemGetImpl(...args),
        })),
        PlaidEnvironments: {
            sandbox: 'https://sandbox.plaid.com',
            development: 'https://development.plaid.com',
            production: 'https://production.plaid.com',
        },
    };
});

// Make mockItemGet available globally
const mockItemGet = mockItemGetImpl;

describe('US-020: Monitor Bank Connection Health', () => {
    const mockUserId = 'user_test123';
    const mockUserProfileId = 'profile_test123';
    const mockItemId = 'item_test123';
    const mockAccessTokenId = 'vault_secret_123';
    const mockAccessToken = 'access-sandbox-token-123';

    beforeEach(() => {
        jest.clearAllMocks();

        // Default auth mock
        (auth as jest.Mock).mockResolvedValue({ userId: mockUserId });

        // Default user profile mock
        (prisma.userProfile.findUnique as jest.Mock).mockResolvedValue({
            id: mockUserProfileId,
            clerkId: mockUserId,
        });

        // Default Plaid item mock
        (prisma.plaidItem.findFirst as jest.Mock).mockResolvedValue({
            id: mockItemId,
            userId: mockUserProfileId,
            accessTokenId: mockAccessTokenId,
            institutionId: 'ins_test',
            institutionName: 'Test Bank',
        });

        // Default vault fetch mock - Supabase RPC returns { data, error } structure
        (global.fetch as jest.Mock).mockResolvedValue({
            json: jest.fn().mockResolvedValue({
                data: mockAccessToken,
                error: null
            }),
        });

        // Default Plaid item update mock
        (prisma.plaidItem.update as jest.Mock).mockResolvedValue({
            id: mockItemId,
            status: 'active',
            lastSyncedAt: new Date(),
        });
    });

    describe('BR-033: Active Connection Detection', () => {
        it('should detect active/healthy connection', async () => {
            // Tests BR-033 for US-020: Active status detection
            mockItemGet.mockResolvedValue({
                data: {
                    item: {
                        institution_id: 'ins_test',
                        error: null, // No errors = active
                    },
                },
            });

            const mockRequest = new Request('http://localhost/api/plaid/items/item_test123/status');
            const mockParams = Promise.resolve({ itemId: mockItemId });

            const response = await GET(mockRequest, { params: mockParams });
            const data = await response.json();

            // Verify Plaid was called
            expect(mockItemGet).toHaveBeenCalledWith({
                access_token: mockAccessToken,
            });

            // Verify status is 'active'
            expect(data.status).toBe('active');

            // Verify database was updated
            expect(prisma.plaidItem.update).toHaveBeenCalledWith({
                where: { id: mockItemId },
                data: expect.objectContaining({
                    status: 'active',
                    lastSyncedAt: expect.any(Date),
                }),
            });
        });
    });

    describe('BR-033: ITEM_LOGIN_REQUIRED Detection', () => {
        it('should detect ITEM_LOGIN_REQUIRED and set needs_reauth status', async () => {
            // Tests BR-033 for US-020: ITEM_LOGIN_REQUIRED detection
            mockItemGet.mockResolvedValue({
                data: {
                    item: {
                        institution_id: 'ins_test',
                        error: {
                            error_code: 'ITEM_LOGIN_REQUIRED',
                            error_message: 'Login required',
                        },
                    },
                },
            });

            const mockRequest = new Request('http://localhost/api/plaid/items/item_test123/status');
            const mockParams = Promise.resolve({ itemId: mockItemId });

            const response = await GET(mockRequest, { params: mockParams });
            const data = await response.json();

            // Verify status is 'needs_reauth'
            expect(data.status).toBe('needs_reauth');
            expect(data.error).toEqual({
                error_code: 'ITEM_LOGIN_REQUIRED',
                error_message: 'Login required',
            });

            // Verify database was updated with needs_reauth
            expect(prisma.plaidItem.update).toHaveBeenCalledWith({
                where: { id: mockItemId },
                data: expect.objectContaining({
                    status: 'needs_reauth',
                }),
            });
        });
    });

    describe('BR-033: Error Status Detection', () => {
        it('should detect other Plaid errors and set error status', async () => {
            // Tests BR-033 for US-020: Generic error detection
            mockItemGet.mockResolvedValue({
                data: {
                    item: {
                        institution_id: 'ins_test',
                        error: {
                            error_code: 'INSTITUTION_DOWN',
                            error_message: 'Institution temporarily unavailable',
                        },
                    },
                },
            });

            const mockRequest = new Request('http://localhost/api/plaid/items/item_test123/status');
            const mockParams = Promise.resolve({ itemId: mockItemId });

            const response = await GET(mockRequest, { params: mockParams });
            const data = await response.json();

            // Verify status is 'error'
            expect(data.status).toBe('error');
            expect(data.error.error_code).toBe('INSTITUTION_DOWN');

            // Verify database was updated with error
            expect(prisma.plaidItem.update).toHaveBeenCalledWith({
                where: { id: mockItemId },
                data: expect.objectContaining({
                    status: 'error',
                }),
            });
        });
    });

    describe('BR-033: Consent Expiration Tracking', () => {
        it('should return consent expiration time when available', async () => {
            // Tests BR-033 for US-020: Consent tracking
            const expirationTime = '2025-12-31T23:59:59Z';
            mockItemGet.mockResolvedValue({
                data: {
                    item: {
                        institution_id: 'ins_test',
                        consent_expiration_time: expirationTime,
                        error: null,
                    },
                },
            });

            const mockRequest = new Request('http://localhost/api/plaid/items/item_test123/status');
            const mockParams = Promise.resolve({ itemId: mockItemId });

            const response = await GET(mockRequest, { params: mockParams });
            const data = await response.json();

            // Verify consent expiration is returned
            expect(data.consentExpirationTime).toBe(expirationTime);
            expect(response.status).toBe(200);
        });
    });

    describe('Authorization & Ownership', () => {
        it('should reject unauthorized requests', async () => {
            // Tests BR-033 for US-020: Only owner can check status
            (auth as jest.Mock).mockResolvedValue({ userId: null });

            const mockRequest = new Request('http://localhost/api/plaid/items/item_test123/status');
            const mockParams = Promise.resolve({ itemId: mockItemId });

            const response = await GET(mockRequest, { params: mockParams });

            expect(response.status).toBe(401);
        });

        it('should reject if user profile not found', async () => {
            // Tests BR-033 for US-020: Valid user profile required
            (prisma.userProfile.findUnique as jest.Mock).mockResolvedValue(null);

            const mockRequest = new Request('http://localhost/api/plaid/items/item_test123/status');
            const mockParams = Promise.resolve({ itemId: mockItemId });

            const response = await GET(mockRequest, { params: mockParams });

            expect(response.status).toBe(404);
        });

        it('should reject if item does not belong to user', async () => {
            // Tests BR-033 for US-020: Ownership verification
            (prisma.plaidItem.findFirst as jest.Mock).mockResolvedValue(null);

            const mockRequest = new Request('http://localhost/api/plaid/items/item_test123/status');
            const mockParams = Promise.resolve({ itemId: mockItemId });

            const response = await GET(mockRequest, { params: mockParams });

            expect(response.status).toBe(404);
        });
    });

    describe('BR-009: Secure Token Retrieval', () => {
        it('should retrieve access token from Vault securely', async () => {
            // Tests BR-009 for US-020: Vault integration
            mockItemGet.mockResolvedValue({
                data: {
                    item: {
                        institution_id: 'ins_test',
                        error: null,
                    },
                },
            });

            const mockRequest = new Request('http://localhost/api/plaid/items/item_test123/status');
            const mockParams = Promise.resolve({ itemId: mockItemId });

            await GET(mockRequest, { params: mockParams });

            // Verify Vault was called correctly
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('/rest/v1/rpc/get_plaid_access_token'),
                expect.objectContaining({
                    method: 'POST',
                    body: JSON.stringify({ token_id: mockAccessTokenId }),
                })
            );

            // Verify token used with Plaid
            expect(mockItemGet).toHaveBeenCalledWith({
                access_token: mockAccessToken,
            });
        });

        it('should handle vault token retrieval failure', async () => {
            // Tests BR-009 + BR-033 for US-020: Vault errors handled
            (global.fetch as jest.Mock).mockResolvedValue({
                json: jest.fn().mockResolvedValue({
                    data: null,
                    error: 'Token not found'
                }),
            });

            const mockRequest = new Request('http://localhost/api/plaid/items/item_test123/status');
            const mockParams = Promise.resolve({ itemId: mockItemId });

            const response = await GET(mockRequest, { params: mockParams });

            expect(response.status).toBe(404);
        });
    });

    describe('Database Persistence', () => {
        it('should persist status and timestamp to database', async () => {
            // Tests BR-033 for US-020: Database persistence
            mockItemGet.mockResolvedValue({
                data: {
                    item: {
                        institution_id: 'ins_test',
                        error: null,
                    },
                },
            });

            const mockRequest = new Request('http://localhost/api/plaid/items/item_test123/status');
            const mockParams = Promise.resolve({ itemId: mockItemId });

            await GET(mockRequest, { params: mockParams });

            // Verify database update with correct fields
            expect(prisma.plaidItem.update).toHaveBeenCalledWith({
                where: { id: mockItemId },
                data: {
                    status: 'active',
                    lastSyncedAt: expect.any(Date),
                },
            });
        });
    });

    describe('Error Handling', () => {
        it('should handle Plaid API errors gracefully', async () => {
            // Tests BR-033 for US-020: Plaid API error handling
            mockItemGet.mockRejectedValue(new Error('Plaid API error'));

            const mockRequest = new Request('http://localhost/api/plaid/items/item_test123/status');
            const mockParams = Promise.resolve({ itemId: mockItemId });

            const response = await GET(mockRequest, { params: mockParams });

            expect(response.status).toBe(500);
        });

        it('should handle database errors gracefully', async () => {
            // Tests BR-033 for US-020: Database error handling
            (prisma.plaidItem.update as jest.Mock).mockRejectedValue(
                new Error('Database error')
            );

            mockItemGet.mockResolvedValue({
                data: {
                    item: {
                        institution_id: 'ins_test',
                        error: null,
                    },
                },
            });

            const mockRequest = new Request('http://localhost/api/plaid/items/item_test123/status');
            const mockParams = Promise.resolve({ itemId: mockItemId });

            const response = await GET(mockRequest, { params: mockParams });

            expect(response.status).toBe(500);
        });
    });
});

describe('Integration: Status Check Flow', () => {
    it('should complete full status check workflow', async () => {
        // Tests BR-033 for US-020: Full integration workflow
        const mockUserId = 'user_integration';
        const mockItemId = 'item_integration';

        (auth as jest.Mock).mockResolvedValue({ userId: mockUserId });
        (prisma.userProfile.findUnique as jest.Mock).mockResolvedValue({
            id: 'profile_integration',
            clerkId: mockUserId,
        });
        (prisma.plaidItem.findFirst as jest.Mock).mockResolvedValue({
            id: mockItemId,
            userId: 'profile_integration',
            accessTokenId: 'vault_integration',
        });
        (prisma.plaidItem.update as jest.Mock).mockResolvedValue({
            id: mockItemId,
            status: 'active',
            lastSyncedAt: new Date(),
        });
        (global.fetch as jest.Mock).mockResolvedValue({
            json: jest.fn().mockResolvedValue({
                data: 'access-token-integration',
                error: null
            }),
        });

        mockItemGet.mockResolvedValue({
            data: {
                item: {
                    institution_id: 'ins_integration',
                    consent_expiration_time: '2025-12-31T23:59:59Z',
                    error: null,
                },
            },
        });

        const mockRequest = new Request('http://localhost/api/plaid/items/item_integration/status');
        const mockParams = Promise.resolve({ itemId: mockItemId });

        const response = await GET(mockRequest, { params: mockParams });
        const data = await response.json();

        // Verify complete workflow
        expect(auth).toHaveBeenCalled();
        expect(prisma.userProfile.findUnique).toHaveBeenCalled();
        expect(prisma.plaidItem.findFirst).toHaveBeenCalled();
        expect(global.fetch).toHaveBeenCalled();
        expect(mockItemGet).toHaveBeenCalled();
        expect(prisma.plaidItem.update).toHaveBeenCalled();

        // Verify response
        expect(response.status).toBe(200);
        expect(data.status).toBe('active');
        expect(data.institutionId).toBe('ins_integration');
        expect(data.consentExpirationTime).toBe('2025-12-31T23:59:59Z');
    });
});
