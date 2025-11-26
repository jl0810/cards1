/**
 * Plaid Items API
 * Returns all connected bank accounts (Plaid items) for user
 * 
 * @module app/api/plaid/items
 */

import { NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { Errors, successResponse } from '@/lib/api-errors';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * Get all Plaid items (connected banks) for authenticated user
 * 
 * @route GET /api/plaid/items
 * @implements BR-014 - Account Balance Display
 * @implements BR-015 - Due Date Calculation
 * @satisfies US-008 - View Connected Accounts
 * @tested None (needs integration test)
 * 
 * @returns {Promise<NextResponse>} Array of Plaid items with accounts and balances
 */
export async function GET(req: Request) {
    try {
        const { userId } = await auth();

        if (!userId) {
            return Errors.unauthorized();
        }

        let userProfile = await prisma.userProfile.findUnique({
            where: { clerkId: userId },
        });

        if (!userProfile) {
            logger.info('User profile not found, attempting to create', { userId });
            // Self-healing: Create profile if missing
            const user = await currentUser();

            if (user) {
                try {
                    userProfile = await prisma.userProfile.create({
                        data: {
                            clerkId: userId,
                            name: user.firstName || '',
                            avatar: user.imageUrl,
                        }
                    });
                    logger.info('Created user profile', { userId });
                } catch (createError) {
                    logger.error('Error creating user profile in API', createError, { userId });
                    // If creation fails (e.g. race condition), try fetching again
                    userProfile = await prisma.userProfile.findUnique({
                        where: { clerkId: userId },
                    });
                }
            }
        }

        if (!userProfile) {
            return Errors.notFound('User profile');
        }

        const items = await prisma.plaidItem.findMany({
            where: { userId: userProfile.id },
            include: {
                accounts: {
                    include: {
                        extended: {
                            include: {
                                cardProduct: {
                                    include: {
                                        benefits: true
                                    }
                                }
                            }
                        }
                    }
                },
                familyMember: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            },
        });

        return successResponse(items);
    } catch (error) {
        logger.error('Error fetching Plaid items', error);
        return Errors.internal(error instanceof Error ? error.message : 'Unknown error');
    }
}
