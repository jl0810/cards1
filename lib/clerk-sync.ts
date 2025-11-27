/**
 * Manual Clerk sync utilities
 * Use when webhooks fail or for self-healing
 * 
 * @module lib/clerk-sync
 */

import { createClerkClient } from '@clerk/backend';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

// Create Clerk client with explicit secret key for scripts
function getClerkClient() {
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) {
    throw new Error('CLERK_SECRET_KEY not found in environment');
  }
  return createClerkClient({ secretKey });
}

/**
 * Sync a Clerk user to the database
 * Creates UserProfile and primary FamilyMember if they don't exist
 * Updates existing profile if it does
 * 
 * @implements BR-001 - User Profile Creation
 * @satisfies US-001 - User Registration
 * 
 * @param clerkId - The Clerk user ID to sync
 * @returns The synced UserProfile
 */
export async function syncClerkUser(clerkId: string) {
  logger.info('Manual Clerk sync initiated', { clerkId });

  try {
    // 1. Get user from Clerk
    const clerk = getClerkClient();
    const clerkUser = await clerk.users.getUser(clerkId);

    if (!clerkUser) {
      throw new Error(`Clerk user not found: ${clerkId}`);
    }

    logger.info('Clerk user found', {
      clerkId,
      email: clerkUser.emailAddresses[0]?.emailAddress,
      firstName: clerkUser.firstName,
    });

    // 2. Check if UserProfile exists
    let userProfile = await prisma.userProfile.findUnique({
      where: { clerkId },
      include: { familyMembers: true },
    });

    if (userProfile) {
      // Update existing profile
      logger.info('UserProfile exists, updating', { clerkId, profileId: userProfile.id });
      
      userProfile = await prisma.userProfile.update({
        where: { clerkId },
        data: {
          name: clerkUser.firstName || userProfile.name,
          avatar: clerkUser.imageUrl || userProfile.avatar,
          lastLoginAt: new Date(),
        },
        include: { familyMembers: true },
      });

      // Check if primary family member exists
      const hasPrimaryMember = userProfile.familyMembers.some(m => m.isPrimary);
      
      if (!hasPrimaryMember) {
        logger.warn('Primary family member missing, creating', { clerkId });
        await prisma.familyMember.create({
          data: {
            userId: userProfile.id,
            name: clerkUser.firstName || 'Primary',
            email: clerkUser.emailAddresses[0]?.emailAddress,
            isPrimary: true,
            role: 'Owner',
          },
        });
      }

      logger.info('UserProfile updated successfully', { clerkId });
    } else {
      // Create new profile (simulating webhook)
      logger.info('UserProfile not found, creating', { clerkId });

      userProfile = await prisma.userProfile.create({
        data: {
          clerkId,
          name: clerkUser.firstName || undefined,
          avatar: clerkUser.imageUrl || undefined,
          lastLoginAt: new Date(),
          familyMembers: {
            create: {
              name: clerkUser.firstName || 'Primary',
              email: clerkUser.emailAddresses[0]?.emailAddress,
              isPrimary: true,
              role: 'Owner',
            },
          },
        },
        include: { familyMembers: true },
      });

      logger.info('UserProfile created successfully', { 
        clerkId, 
        profileId: userProfile.id,
        familyMembers: userProfile.familyMembers.length,
      });
    }

    return userProfile;
  } catch (error) {
    logger.error('Failed to sync Clerk user', error, { clerkId });
    throw error;
  }
}

/**
 * Sync all Clerk users to database
 * Useful for bulk sync or recovery
 * 
 * @returns Array of synced user profiles
 */
export async function syncAllClerkUsers() {
  logger.info('Bulk Clerk sync initiated');

  try {
    const clerk = getClerkClient();
    
    // Get all users from Clerk (paginated)
    const users = await clerk.users.getUserList({ limit: 100 });
    
    logger.info(`Found ${users.data.length} users in Clerk`);

    const results = [];
    
    for (const clerkUser of users.data) {
      try {
        const profile = await syncClerkUser(clerkUser.id);
        results.push({ success: true, clerkId: clerkUser.id, profileId: profile.id });
      } catch (error) {
        logger.error('Failed to sync user', error, { clerkId: clerkUser.id });
        results.push({ 
          success: false, 
          clerkId: clerkUser.id, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }

    logger.info('Bulk sync complete', {
      total: results.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
    });

    return results;
  } catch (error) {
    logger.error('Bulk sync failed', error);
    throw error;
  }
}
