/**
 * Admin Card Catalog API
 * Manages credit card products and benefits (admin-only)
 * 
 * @module app/api/admin/card-catalog
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAdmin } from '@/lib/admin';
import { CreateCardProductSchema, safeValidateSchema } from '@/lib/validations';

/**
 * Get all card products with benefits (admin only)
 * 
 * @route GET /api/admin/card-catalog
 * @implements BR-031 - Admin Role Required
 * @satisfies US-019 - Card Catalog Management
 * @tested __tests__/api/admin/card-catalog.test.ts
 * 
 * @returns {Promise<NextResponse>} Array of card products with benefits and usage counts
 */
export async function GET(req: Request) {
    return withAdmin(async () => {
        const products = await prisma.cardProduct.findMany({
            include: {
                benefits: true,
                _count: {
                    select: {
                        accountExtensions: true
                    }
                }
            },
            orderBy: [
                { issuer: 'asc' },
                { productName: 'asc' }
            ]
        });

        return NextResponse.json(products);
    });
}

/**
 * Create a new card product (admin only)
 * 
 * @route POST /api/admin/card-catalog
 * @implements BR-031 - Admin Role Required
 * @implements BR-026 - Input Validation Required
 * @satisfies US-019 - Card Catalog Management
 * @tested __tests__/api/admin/card-catalog.test.ts
 */
export async function POST(req: Request) {
    return withAdmin(async () => {
        const body = await req.json();
        
        // Validate with Zod schema (BR-026)
        const validation = safeValidateSchema(CreateCardProductSchema, body);
        if (!validation.success) {
            return NextResponse.json(
                { error: 'Validation failed', details: validation.error.issues },
                { status: 400 }
            );
        }

        const { issuer, productName, cardType, annualFee, signupBonus, imageUrl, bankId } = validation.data;

        const product = await prisma.cardProduct.create({
            data: {
                issuer,
                productName,
                cardType,
                annualFee,
                signupBonus,
                imageUrl,
                bankId,
            },
            include: {
                benefits: true
            }
        });

        return NextResponse.json(product, { status: 201 });
    });
}
