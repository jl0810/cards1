/**
 * Fix Family Member Names API Endpoint
 * 
 * Calls Clerk API to fix family member names that were incorrectly set
 * 
 * @implements BR-001A - Clerk Sync (Self-Healing)
 * @route POST /api/admin/fix-family-names
 */

import { NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function POST() {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Check if user is admin (you can add admin check here)
        // For now, any authenticated user can fix their own family member

        logger.info('Starting family member name fix', { userId });

        // Get all family members for this user
        const userProfile = await prisma.userProfile.findUnique({
            where: { clerkId: userId },
            include: {
                familyMembers: true,
            },
        });

        if (!userProfile) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const results = {
            fixed: 0,
            skipped: 0,
            errors: [] as string[],
        };

        for (const member of userProfile.familyMembers) {
            // Check if name needs fixing
            const nameNeedsFixing =
                member.name.startsWith('user_') ||
                member.name.length > 50 ||
                (member.name.includes('Z') && member.name.length > 20) ||
                member.name === 'Primary';

            if (nameNeedsFixing && member.isPrimary) {
                try {
                    // Get user's actual name from Clerk
                    const client = await clerkClient();
                    const clerkUser = await client.users.getUser(userId);

                    const properName = clerkUser.firstName ||
                        clerkUser.username ||
                        clerkUser.emailAddresses[0]?.emailAddress?.split('@')[0] ||
                        'User';

                    // Update family member
                    await prisma.familyMember.update({
                        where: { id: member.id },
                        data: { name: properName },
                    });

                    // Update user profile if needed
                    if (!userProfile.name || userProfile.name === member.name) {
                        await prisma.userProfile.update({
                            where: { id: userProfile.id },
                            data: { name: properName },
                        });
                    }

                    logger.info('Fixed family member name', {
                        memberId: member.id,
                        oldName: member.name,
                        newName: properName,
                    });

                    results.fixed++;
                } catch (error) {
                    logger.error('Failed to fix family member', error, { memberId: member.id });
                    results.errors.push(`Failed to fix ${member.id}: ${(error as Error).message}`);
                }
            } else {
                results.skipped++;
            }
        }

        return NextResponse.json({
            success: true,
            results,
        });
    } catch (error) {
        logger.error('Error in fix-family-names endpoint', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
