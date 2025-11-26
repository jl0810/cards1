/**
 * Plaid Item Health Check API
 * Checks connection status and token validity via Plaid API
 * 
 * @module app/api/plaid/items/[itemId]/status
 */

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid';
import { env } from '@/env';

export const dynamic = 'force-dynamic';

const configuration = new Configuration({
    basePath: PlaidEnvironments[env.PLAID_ENV as keyof typeof PlaidEnvironments] || PlaidEnvironments.production,
    baseOptions: {
        headers: {
            'PLAID-CLIENT-ID': env.PLAID_CLIENT_ID,
            'PLAID-SECRET': env.PLAID_SECRET,
        },
    },
});

const plaidClient = new PlaidApi(configuration);

/**
 * Get current item status from Plaid
 * 
 * @route GET /api/plaid/items/[itemId]/status
 * @implements BR-033 - Connection Health Monitoring
 * @satisfies US-020 - Monitor Bank Connection Health
 * @tested None (HIGH PRIORITY - needs integration test)
 * 
 * @param {Request} req - HTTP request
 * @param {Object} params - Route parameters
 * @param {string} params.itemId - ID of Plaid item to check
 * @returns {Promise<NextResponse>} Status object with health indicators
 */
export async function GET(
    req: Request,
    { params }: { params: Promise<{ itemId: string }> }
) {
    try {
        const { itemId } = await params;
        const { userId } = await auth();
        if (!userId) return new NextResponse("Unauthorized", { status: 401 });

        const userProfile = await prisma.userProfile.findUnique({
            where: { clerkId: userId },
        });
        if (!userProfile) return new NextResponse("User not found", { status: 404 });

        // Get the PlaidItem
        const plaidItem = await prisma.plaidItem.findFirst({
            where: {
                id: itemId,
                userId: userProfile.id
            }
        });

        if (!plaidItem) return new NextResponse("Item not found", { status: 404 });

        // Get access token from Supabase Vault
        // Use Prisma $queryRaw to query vault.decrypted_secrets view
        const secretId = plaidItem.accessTokenId;
        const vaultResult = await prisma.$queryRaw<Array<{ decrypted_secret: string }>>`
            SELECT decrypted_secret FROM vault.decrypted_secrets WHERE id = ${secretId}::uuid;
        `;

        const accessToken = vaultResult[0]?.decrypted_secret;
        if (!accessToken) {
            return new NextResponse("Access token not found", { status: 404 });
        }

        // Call Plaid's /item/get endpoint
        const itemResponse = await plaidClient.itemGet({
            access_token: accessToken
        });

        const item = itemResponse.data.item;

        // Determine status
        let status = 'active';
        if (item.error) {
            if (item.error.error_code === 'ITEM_LOGIN_REQUIRED') {
                status = 'needs_reauth';
            } else {
                status = 'error';
            }
        }

        // Update status in database
        await prisma.plaidItem.update({
            where: { id: itemId },
            data: {
                status,
                lastSyncedAt: new Date()
            }
        });

        return NextResponse.json({
            status,
            institutionId: item.institution_id,
            consentExpirationTime: item.consent_expiration_time,
            error: item.error
        });

    } catch (error) {
        console.error('Error checking item status:', error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}
