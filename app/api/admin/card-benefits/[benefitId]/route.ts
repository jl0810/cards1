/**
 * Admin Card Benefits API
 * Alternative endpoint for managing card benefits
 * 
 * @module app/api/admin/card-benefits/[benefitId]
 * @implements BR-031 - Admin Role Required
 * @satisfies US-019 - Card Catalog Management
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { withAdmin } from '@/lib/admin';
import { Errors } from '@/lib/api-errors';
import { logger } from '@/lib/logger';
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit';

const UpdateBenefitSchema = z.object({
    benefitName: z.string().min(1).max(200).optional(),
    timing: z.string().optional(),
    maxAmount: z.union([z.number(), z.string(), z.null()]).optional(),
    keywords: z.array(z.string()).optional(),
    active: z.boolean().optional(),
});

/**
 * Update a card benefit
 * @route PATCH /api/admin/card-benefits/[benefitId]
 */
export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ benefitId: string }> }
) {
    const limited = await rateLimit(req, RATE_LIMITS.write);
    if (limited) {
        return new Response('Too many requests', { status: 429 });
    }

    return withAdmin(async () => {
        const { benefitId } = await params;
        const body = await req.json();

        const validation = UpdateBenefitSchema.safeParse(body);
        if (!validation.success) {
            return Errors.badRequest('Invalid benefit data');
        }

        const { benefitName, timing, maxAmount, keywords, active } = validation.data;

        try {
            const benefit = await prisma.cardBenefit.update({
                where: { id: benefitId },
                data: {
                    benefitName,
                    timing,
                    maxAmount: maxAmount !== undefined 
                        ? (typeof maxAmount === 'string' ? parseFloat(maxAmount) : maxAmount) 
                        : undefined,
                    keywords: Array.isArray(keywords) ? keywords : undefined,
                    active
                }
            });

            return NextResponse.json(benefit);
        } catch (error) {
            logger.error('Error updating benefit:', error, { benefitId });
            return Errors.internal();
        }
    });
}

/**
 * Delete a card benefit
 * @route DELETE /api/admin/card-benefits/[benefitId]
 */
export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ benefitId: string }> }
) {
    const limited = await rateLimit(req, RATE_LIMITS.sensitive);
    if (limited) {
        return new Response('Too many requests', { status: 429 });
    }

    return withAdmin(async () => {
        const { benefitId } = await params;

        try {
            await prisma.cardBenefit.delete({
                where: { id: benefitId }
            });

            return NextResponse.json({ success: true });
        } catch (error) {
            logger.error('Error deleting benefit:', error, { benefitId });
            return Errors.internal();
        }
    });
}
