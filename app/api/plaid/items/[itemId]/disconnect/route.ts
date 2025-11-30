/**
 * Plaid Item Disconnect API
 * Marks bank connection as inactive while preserving access token per Plaid requirement
 * 
 * @module app/api/plaid/items/[itemId]/disconnect
 */

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { Errors } from '@/lib/api-errors';
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

/**
 * Disconnect a Plaid item (mark as disconnected, but preserve access_token per Plaid requirement)
 * 
 * @route POST /api/plaid/items/[itemId]/disconnect
 * @implements BR-034 - Access Token Preservation
 * @satisfies US-006 - Link Bank Account (disconnect capability)
 * @satisfies US-020 - Monitor Bank Connection Health
 * @tested __tests__/api/plaid/items/disconnect.test.ts
 * 
 * @param {Request} req - HTTP request
 * @param {Object} params - Route parameters
 * @param {string} params.itemId - ID of Plaid item to disconnect
 * @returns {Promise<NextResponse>} Success response
 */
export async function POST(
    req: Request,
    { params }: { params: Promise<{ itemId: string }> }
) {
    // Rate limit: 5 disconnects per minute (sensitive/destructive operation)
    const limited = await rateLimit(req, RATE_LIMITS.sensitive);
    if (limited) {
        return new Response('Too many requests', { status: 429 });
    }

    const { itemId } = await params;

    try {
        const { userId } = await auth();
        if (!userId) return Errors.unauthorized();
        if (!itemId || itemId.trim() === '') return Errors.badRequest('Item ID is required');

        const userProfile = await prisma.userProfile.findUnique({
            where: { clerkId: userId },
        });
        if (!userProfile) return Errors.notFound('User profile');

        // Verify ownership (IDOR protection)
        const plaidItem = await prisma.plaidItem.findFirst({
            where: {
                id: itemId,
                userId: userProfile.id
            }
        });

        if (!plaidItem) return Errors.notFound('Plaid item');

        // Update status to disconnected
        // IMPORTANT: We do NOT delete the access_token from Vault per Plaid's requirement
        await prisma.plaidItem.update({
            where: { id: itemId },
            data: {
                status: 'disconnected'
            }
        });

        return NextResponse.json({ success: true });

    } catch (error) {
        logger.error('Error disconnecting item', error, { itemId: itemId });
        return Errors.internal();
    }
}
