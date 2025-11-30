/**
 * Plaid Item Management API
 * Assign items to family members
 * 
 * @module app/api/plaid/items/[itemId]
 * @implements BR-010 - Family Member Assignment
 * @satisfies US-006 - Link Bank Account
 */

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { AssignPlaidItemSchema, safeValidateSchema } from '@/lib/validations';
import { Errors } from '@/lib/api-errors';
import { logger } from '@/lib/logger';
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit';

/**
 * Assign a Plaid item to a family member
 * @route PATCH /api/plaid/items/[itemId]
 */
export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ itemId: string }> }
) {
    const limited = await rateLimit(req, RATE_LIMITS.write);
    if (limited) {
        return new Response('Too many requests', { status: 429 });
    }

    try {
        const { userId } = await auth();
        if (!userId) {
            return Errors.unauthorized();
        }

        const body = await req.json();
        
        // Validate request body using Zod
        const validation = safeValidateSchema(AssignPlaidItemSchema, body);
        if (!validation.success) {
            return Errors.badRequest(validation.error.errors[0]?.message || 'Invalid input');
        }

        const { familyMemberId } = validation.data;

        const userProfile = await prisma.userProfile.findUnique({
            where: { clerkId: userId },
        });

        if (!userProfile) {
            return Errors.notFound('User profile');
        }

        const { itemId } = await params;

        // Verify the item belongs to the user
        const item = await prisma.plaidItem.findUnique({
            where: { id: itemId },
        });

        if (!item || item.userId !== userProfile.id) {
            return Errors.notFound('Plaid item');
        }

        // Verify the family member belongs to the user
        const familyMember = await prisma.familyMember.findUnique({
            where: { id: familyMemberId },
        });

        if (!familyMember || familyMember.userId !== userProfile.id) {
            return Errors.notFound('Family member');
        }

        // Update the item and all its accounts
        // We use a transaction to ensure consistency
        const updatedItem = await prisma.$transaction(async (tx) => {
            // Update item
            const updated = await tx.plaidItem.update({
                where: { id: itemId },
                data: { familyMemberId },
            });

            // Update all accounts associated with this item
            await tx.plaidAccount.updateMany({
                where: { plaidItemId: itemId },
                data: { familyMemberId },
            });

            return updated;
        });

        return NextResponse.json({
            success: true,
            data: updatedItem
        });
    } catch (error: unknown) {
        logger.error('Error updating Plaid item:', error);
        return Errors.internal(error instanceof Error ? error.message : 'Unknown error');
    }
}
