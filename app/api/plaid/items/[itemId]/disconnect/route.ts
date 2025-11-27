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

export const dynamic = 'force-dynamic';

/**
 * Disconnect a Plaid item (mark as disconnected, but preserve access_token per Plaid requirement)
 * 
 * @route POST /api/plaid/items/[itemId]/disconnect
 * @implements BR-034 - Access Token Preservation
 * @satisfies US-006 - Link Bank Account (disconnect capability)
 * @satisfies US-020 - Monitor Bank Connection Health
 * @tested None (HIGH PRIORITY - needs test)
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
    const { itemId } = await params;

    try {
        const { userId } = await auth();
        if (!userId) return new NextResponse("Unauthorized", { status: 401 });
        if (!itemId || itemId.trim() === '') return new NextResponse("Item ID is required", { status: 400 });

        const userProfile = await prisma.userProfile.findUnique({
            where: { clerkId: userId },
        });
        if (!userProfile) return new NextResponse("User not found", { status: 404 });

        // Verify ownership
        const plaidItem = await prisma.plaidItem.findFirst({
            where: {
                id: itemId,
                userId: userProfile.id
            }
        });

        if (!plaidItem) return new NextResponse("Item not found", { status: 404 });

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
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}
