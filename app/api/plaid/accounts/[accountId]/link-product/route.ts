/**
 * Link Card Product to Account API
 * Associates a credit card product with a Plaid account for benefit matching
 * 
 * @module app/api/plaid/accounts/[accountId]/link-product
 * @implements BR-018 - Card Product Linking
 * @satisfies US-011 - Link Card Products
 */

import { auth } from '@/lib/auth';
import { db, schema, eq, and } from '@/db';
import { Errors } from '@/lib/api-errors';
import { logger } from '@/lib/logger';
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { z } from 'zod';
import { NextResponse } from 'next/server';

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

    try {
        const session = await auth();
        const user = session?.user;
        if (!user?.id) return Errors.unauthorized();

        const { accountId } = await params;

        // Validate request body
        const body = await req.json();
        const validation = LinkProductSchema.safeParse(body);
        if (!validation.success) {
            return Errors.badRequest('Invalid card product ID');
        }
        const { cardProductId } = validation.data;

        // Verify user owns this account
        const userProfile = await db.query.userProfiles.findFirst({
            where: eq(schema.userProfiles.supabaseId, user.id)
        });

        if (!userProfile) {
            return Errors.notFound('User profile');
        }

        // Verify account belongs to user (IDOR protection)
        const account = await db.query.plaidAccounts.findFirst({
            where: eq(schema.plaidAccounts.id, accountId),
            with: {
                plaidItem: true
            }
        });

        if (!account || account.plaidItem.userId !== userProfile.id) {
            return Errors.notFound('Account');
        }

        // Upsert AccountExtended using Drizzle
        await db.insert(schema.accountExtended)
            .values({
                plaidAccountId: account.id,
                cardProductId: cardProductId || null,
                updatedAt: new Date(),
            })
            .onConflictDoUpdate({
                target: schema.accountExtended.plaidAccountId,
                set: {
                    cardProductId: cardProductId || null,
                    updatedAt: new Date(),
                },
            });

        // Fetch result with relations
        const extended = await db.query.accountExtended.findFirst({
            where: eq(schema.accountExtended.plaidAccountId, account.id),
            with: {
                cardProduct: {
                    with: {
                        benefits: true
                    }
                }
            }
        });

        return NextResponse.json(extended);
    } catch (error) {
        logger.error('Error linking card product', error, { accountId: (await params).accountId });
        return Errors.internal();
    }
}
