/**
 * Tests for Admin Card Catalog API
 * 
 * Tests BR-031 (Admin Role Required) for US-019
 * 
 * @implements BR-031 - Admin Role Required
 * @satisfies US-019 - Card Catalog Management
 */

import { GET, POST } from '@/app/api/admin/card-catalog/route';
import { prisma } from '@/lib/prisma';
import { requireAdmin, withAdmin } from '@/lib/admin';

// Mock dependencies
jest.mock('@/lib/admin', () => ({
    requireAdmin: jest.fn(),
    withAdmin: jest.fn((handler) => handler({ userId: 'admin_user', isAdmin: true })),
}));

jest.mock('@/lib/prisma', () => ({
    prisma: {
        cardProduct: {
            findMany: jest.fn(),
            create: jest.fn(),
        },
    },
}));

jest.mock('@/lib/rate-limit', () => ({
    rateLimit: jest.fn().mockResolvedValue(false),
    RATE_LIMITS: {
        write: { max: 20, window: '1 m' },
    },
}));

describe('US-019: Card Catalog Management', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('GET /api/admin/card-catalog', () => {
        describe('BR-031: Admin Role Required', () => {
            it('should allow admin users to fetch card catalog', async () => {
                const mockProducts = [
                    {
                        id: 'prod_1',
                        issuer: 'Chase',
                        productName: 'Sapphire Preferred',
                        benefits: [],
                        _count: { accountExtensions: 5 },
                    },
                ];

                (prisma.cardProduct.findMany as jest.Mock).mockResolvedValue(mockProducts);

                const mockRequest = new Request('http://localhost/api/admin/card-catalog');
                const response = await GET(mockRequest);
                const data = await response.json();

                expect(response.status).toBe(200);
                expect(data).toHaveLength(1);
                expect(data[0].issuer).toBe('Chase');
            });

            it('should reject non-admin users', async () => {
                (withAdmin as jest.Mock).mockImplementationOnce(() => {
                    return Response.json({ error: 'Admin access required' }, { status: 403 });
                });

                const mockRequest = new Request('http://localhost/api/admin/card-catalog');
                const response = await GET(mockRequest);

                expect(response.status).toBe(403);
            });
        });

        describe('Response Format', () => {
            it('should include benefits and usage counts', async () => {
                const mockProducts = [
                    {
                        id: 'prod_1',
                        issuer: 'Amex',
                        productName: 'Platinum',
                        benefits: [
                            { id: 'ben_1', benefitName: 'Uber Credit' },
                        ],
                        _count: { accountExtensions: 10 },
                    },
                ];

                (prisma.cardProduct.findMany as jest.Mock).mockResolvedValue(mockProducts);

                const mockRequest = new Request('http://localhost/api/admin/card-catalog');
                const response = await GET(mockRequest);
                const data = await response.json();

                expect(data[0].benefits).toHaveLength(1);
                expect(data[0]._count.accountExtensions).toBe(10);
            });

            it('should sort by issuer and product name', async () => {
                (prisma.cardProduct.findMany as jest.Mock).mockResolvedValue([]);

                const mockRequest = new Request('http://localhost/api/admin/card-catalog');
                await GET(mockRequest);

                const callArgs = (prisma.cardProduct.findMany as jest.Mock).mock.calls[0][0];
                expect(callArgs.orderBy).toEqual([
                    { issuer: 'asc' },
                    { productName: 'asc' },
                ]);
            });
        });
    });

    describe('POST /api/admin/card-catalog', () => {
        describe('BR-031: Admin Role Required', () => {
            it('should allow admin users to create card products', async () => {
                const newProduct = {
                    id: 'prod_new',
                    issuer: 'Capital One',
                    productName: 'Venture X',
                    benefits: [],
                };

                (prisma.cardProduct.create as jest.Mock).mockResolvedValue(newProduct);

                const mockRequest = new Request('http://localhost/api/admin/card-catalog', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        issuer: 'Capital One',
                        productName: 'Venture X',
                    }),
                });
                const response = await POST(mockRequest);
                const data = await response.json();

                expect(response.status).toBe(201);
                expect(data.issuer).toBe('Capital One');
            });
        });

        describe('Input Validation', () => {
            it('should reject missing required fields', async () => {
                const mockRequest = new Request('http://localhost/api/admin/card-catalog', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({}),
                });
                const response = await POST(mockRequest);

                expect(response.status).toBe(400);
            });

            it('should accept optional fields', async () => {
                const newProduct = {
                    id: 'prod_new',
                    issuer: 'Citi',
                    productName: 'Double Cash',
                    annualFee: 0,
                    signupBonus: '$200 cash back',
                    benefits: [],
                };

                (prisma.cardProduct.create as jest.Mock).mockResolvedValue(newProduct);

                const mockRequest = new Request('http://localhost/api/admin/card-catalog', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        issuer: 'Citi',
                        productName: 'Double Cash',
                        annualFee: 0,
                        signupBonus: '$200 cash back',
                    }),
                });
                const response = await POST(mockRequest);

                expect(response.status).toBe(201);
            });
        });

        describe('Rate Limiting', () => {
            it('should respect rate limits', async () => {
                const { rateLimit } = require('@/lib/rate-limit');
                rateLimit.mockResolvedValueOnce(true);

                const mockRequest = new Request('http://localhost/api/admin/card-catalog', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        issuer: 'Test',
                        productName: 'Card',
                    }),
                });
                const response = await POST(mockRequest);

                expect(response.status).toBe(429);
            });
        });
    });
});
