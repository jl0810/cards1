/**
 * Admin Benefit Management API
 * Update and delete individual card benefits
 * 
 * @module app/api/admin/benefits/[benefitId]
 * @implements BR-031 - Admin Role Required
 * @satisfies US-019 - Card Catalog Management
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { cardBenefits } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { requireAdmin } from '@/lib/admin';
import { Errors } from '@/lib/api-errors';
import { logger } from '@/lib/logger';
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit';

const UpdateBenefitSchema = z.object({
    benefitName: z.string().min(1).max(200).optional(),
    type: z.enum(['STATEMENT_CREDIT', 'EXTERNAL_CREDIT', 'INSURANCE', 'PERK']).optional(),
    description: z.string().max(1000).nullable().optional(),
    timing: z.string().optional(),
    maxAmount: z.number().nonnegative().nullable().optional(),
    keywords: z.array(z.string()).optional(),
    isApproved: z.boolean().optional(),
});

/**
 * Update a benefit
 * @route PATCH /api/admin/benefits/[benefitId]
 */
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ benefitId: string }> }
) {
    const limited = await rateLimit(request, RATE_LIMITS.write);
    if (limited) {
        return new Response('Too many requests', { status: 429 });
    }

    try {
        await requireAdmin();
        const { benefitId } = await params;
        const body = await request.json();

        const validation = UpdateBenefitSchema.safeParse(body);
        if (!validation.success) {
            return Errors.badRequest('Invalid benefit data');
        }

        const data = validation.data;

        const [updatedBenefit] = await db.update(cardBenefits)
            .set({
                benefitName: data.benefitName,
                type: data.type,
                description: data.description,
                timing: data.timing,
                maxAmount: data.maxAmount,
                keywords: data.keywords,
                isApproved: data.isApproved,
                updatedAt: new Date(),
            })
            .where(eq(cardBenefits.id, benefitId))
            .returning();

        return NextResponse.json({ success: true, benefit: updatedBenefit });

    } catch (error) {
        logger.error('Error updating benefit:', error);
        return Errors.internal();
    }
}

/**
 * Delete a benefit
 * @route DELETE /api/admin/benefits/[benefitId]
 */
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ benefitId: string }> }
) {
    const limited = await rateLimit(request, RATE_LIMITS.sensitive);
    if (limited) {
        return new Response('Too many requests', { status: 429 });
    }

    try {
        await requireAdmin();
        const { benefitId } = await params;

        await db.delete(cardBenefits)
            .where(eq(cardBenefits.id, benefitId));

        return NextResponse.json({ success: true });

    } catch (error) {
        logger.error('Error deleting benefit:', error);
        return Errors.internal();
    }
}
