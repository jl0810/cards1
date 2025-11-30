/**
 * Link Card Product to Account API
 * Associates a credit card product with a Plaid account for benefit matching
 * 
 * @module app/api/plaid/accounts/[accountId]/link-product
 * @implements BR-018 - Card Product Linking
 * @satisfies US-011 - Link Card Products
 */

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { Errors } from '@/lib/api-errors';
import { logger } from '@/lib/logger';
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit';

const LinkProductSchema = z.object({
    cardProductId: z.string().nullable().optional(),
});

/**
 * Link a card product to an account
 * 
 * @route PATCH /api/plaid/accounts/[accountId]/link-product
 * @tested None (needs test)
 */
export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ accountId: string }> }
) {
    // Rate limit: 20 writes per minute
    const limited = await rateLimit(req, RATE_LIMITS.write);
    if (limited) {
        return new Response('Too many requests', { status: 429 });
    }

    const { userId } = await auth();

    if (!userId) {
        return Errors.unauthorized();
    }

    const { accountId } = await params;
    
    // Validate request body
    const body = await req.json();
    const validation = LinkProductSchema.safeParse(body);
    if (!validation.success) {
        return Errors.badRequest('Invalid card product ID');
    }
    const { cardProductId } = validation.data;

    try {
        // Verify user owns this account
        const userProfile = await prisma.userProfile.findUnique({
            where: { clerkId: userId }
        });

        if (!userProfile) {
            return Errors.notFound('User profile');
        }

        // Verify account belongs to user (IDOR protection)
        const account = await prisma.plaidAccount.findFirst({
            where: {
                id: accountId,
                plaidItem: {
                    userId: userProfile.id
                }
            }
        });

        if (!account) {
            return Errors.notFound('Account');
        }

        // Upsert AccountExtended
        const extended = await prisma.accountExtended.upsert({
            where: { plaidAccountId: account.id },
            create: {
                plaidAccountId: account.id,
                cardProductId: cardProductId || null
            },
            update: {
                cardProductId: cardProductId || null
            },
            include: {
                cardProduct: {
                    include: {
                        benefits: true
                    }
                }
            }
        });

        return NextResponse.json(extended);
    } catch (error) {
        logger.error('Error linking card product', error, { accountId });
        return Errors.internal();
    }
}
