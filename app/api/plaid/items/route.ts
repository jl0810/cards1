import { NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { Errors, successResponse } from '@/lib/api-errors';

export const dynamic = 'force-dynamic';

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
            console.log(`User profile not found for ${userId}, attempting to create...`);
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
                    console.log(`Created user profile for ${userId}`);
                } catch (createError) {
                    console.error('Error creating user profile in API:', createError);
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
        console.error('Error fetching Plaid items:', error);
        return Errors.internal(error instanceof Error ? error.message : 'Unknown error');
    }
}
