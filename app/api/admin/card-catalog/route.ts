/**
 * Admin Card Catalog API
 * Manages credit card products and benefits (admin-only)
 * 
 * @module app/api/admin/card-catalog
 */

import { NextResponse } from 'next/server';
import { db } from '@/db';
import { cardProducts, cardBenefits } from '@/db/schema';
import { withAdmin } from '@/lib/admin';
import { CreateCardProductSchema, safeValidateSchema } from '@/lib/validations';
import { desc, asc } from 'drizzle-orm';

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
export async function GET(_req: Request) {
    return withAdmin(async () => {
        const rawProducts = await db.query.cardProducts.findMany({
            with: {
                benefits: true,
                linkedAccounts: {
                    columns: {
                        id: true
                    }
                }
            },
            orderBy: (products, { asc }) => [asc(products.issuer), asc(products.productName)]
        });

        // Map Drizzle result to match expected API structure (adding _count)
        const products = rawProducts.map(p => ({
            ...p,
            _count: {
                accountExtensions: p.linkedAccounts?.length || 0
            }
        }));

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

        const [product] = await db.insert(cardProducts)
            .values({
                issuer,
                productName,
                cardType,
                annualFee: typeof annualFee === 'string' ? parseFloat(annualFee) : annualFee,
                signupBonus,
                imageUrl,
                bankId,
                updatedAt: new Date(),
            })
            .returning();

        // Add empty benefits to match response
        const productWithBenefits = { ...product, benefits: [] };

        return NextResponse.json(productWithBenefits, { status: 201 });
    });
}
