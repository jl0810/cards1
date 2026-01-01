/**
 * Admin Card Product Detail API
 * Manage individual card products
 * 
 * @module app/api/admin/card-catalog/[cardId]
 * @implements BR-031 - Admin Role Required
 * @satisfies US-019 - Card Catalog Management
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { cardProducts } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { requireAdmin } from '@/lib/admin';
import { Errors } from '@/lib/api-errors';
import { logger } from '@/lib/logger';
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit';

const UpdateCardSchema = z.object({
    productName: z.string().min(1).max(200).optional(),
    issuer: z.string().min(1).max(100).optional(),
    cardType: z.string().nullable().optional(),
    annualFee: z.number().nonnegative().nullable().optional(),
    signupBonus: z.string().max(500).nullable().optional(),
    imageUrl: z.string().url().nullable().optional(),
    active: z.boolean().optional(),
});

/**
 * Get card product details
 * @route GET /api/admin/card-catalog/[cardId]
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ cardId: string }> }
) {
    try {
        await requireAdmin();
        const { cardId } = await params;

        const card = await db.query.cardProducts.findFirst({
            where: (table: any, { eq }: any) => eq(table.id, cardId),
            with: {
                benefits: {
                    orderBy: (benefits: any, { asc }: any) => [asc(benefits.benefitName)]
                }
            }
        });

        if (!card) {
            return Errors.notFound('Card product');
        }

        return NextResponse.json(card);
    } catch (error) {
        logger.error('Error fetching card:', error);
        return Errors.internal();
    }
}

/**
 * Update card product
 * @route PATCH /api/admin/card-catalog/[cardId]
 */
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ cardId: string }> }
) {
    // Rate limit admin writes
    const limited = await rateLimit(request, RATE_LIMITS.write);
    if (limited) {
        return new Response('Too many requests', { status: 429 });
    }

    try {
        await requireAdmin();
        const { cardId } = await params;
        const body = await request.json();

        // Validate input
        const validation = UpdateCardSchema.safeParse(body);
        if (!validation.success) {
            return Errors.badRequest('Invalid card data');
        }

        const data = validation.data;

        // Update Card Product Only (not benefits)
        const [updatedCard] = await db.update(cardProducts)
            .set({
                productName: data.productName,
                issuer: data.issuer,
                cardType: data.cardType,
                annualFee: typeof data.annualFee === 'string' ? parseFloat(data.annualFee) : data.annualFee,
                signupBonus: data.signupBonus,
                imageUrl: data.imageUrl,
                active: data.active,
                updatedAt: new Date(),
            })
            .where(eq(cardProducts.id, cardId))
            .returning();

        // Note: Benefits are NOT updated here - they should be managed individually
        // This prevents accidentally approving draft benefits when saving card details

        return NextResponse.json({ success: true, card: updatedCard });

    } catch (error) {
        logger.error('Error updating card:', error);
        return Errors.internal();
    }
}
