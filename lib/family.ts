/**
 * Family member management utilities
 * 
 * @module lib/family
 * @implements BR-003 - Family Member Ownership
 * @implements BR-010 - Family Member Assignment
 * @satisfies US-003 - Add Family Members
 * @satisfies US-006 - Link Bank Account
 * @tested None (needs tests)
 */

import { prisma } from './prisma';

interface ProfileLike {
  id: string;
  name?: string | null;
  avatar?: string | null;
}

/**
 * Ensures primary family member exists for user profile
 * 
 * @implements BR-010 - Family Member Assignment
 */
export async function ensurePrimaryFamilyMember(userProfile: ProfileLike) {
  let member = await prisma.familyMember.findFirst({
    where: {
      userId: userProfile.id,
      isPrimary: true,
    },
  });

  const desiredName = userProfile.name || 'Primary Member';
  const updates: Record<string, string | null> = {};

  if (member) {
    if (member.name !== desiredName) {
      updates.name = desiredName;
    }
    if (userProfile.avatar && member.avatar !== userProfile.avatar) {
      updates.avatar = userProfile.avatar;
    }

    if (Object.keys(updates).length > 0) {
      member = await prisma.familyMember.update({
        where: { id: member.id },
        data: updates,
      });
    }

    return member;
  }

  return prisma.familyMember.create({
    data: {
      userId: userProfile.id,
      name: desiredName,
      avatar: userProfile.avatar,
      role: 'Owner',
      isPrimary: true,
    },
  });
}

/**
 * Verifies family member belongs to user
 * 
 * @implements BR-003 - Family Member Ownership
 */
export async function assertFamilyMemberOwnership(userProfileId: string, familyMemberId: string) {
  const member = await prisma.familyMember.findFirst({
    where: {
      id: familyMemberId,
      userId: userProfileId,
    },
  });

  if (!member) {
    throw new Error('Family member not found for this user');
  }

  return member;
}
