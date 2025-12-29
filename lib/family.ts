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

import { db, schema, eq, and } from '@/db';

interface ProfileLike {
  id: string;
  name?: string | null;
  avatar?: string | null;
}

/**
 * Ensures primary family member exists for user profile
 */
export async function ensurePrimaryFamilyMember(userProfile: ProfileLike) {
  let [member] = await db
    .select()
    .from(schema.familyMembers)
    .where(
      and(
        eq(schema.familyMembers.userId, userProfile.id),
        eq(schema.familyMembers.isPrimary, true)
      )
    )
    .limit(1);

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
      const [updatedMember] = await db
        .update(schema.familyMembers)
        .set({
          ...updates,
          updatedAt: new Date(),
        })
        .where(eq(schema.familyMembers.id, member.id))
        .returning();
      member = updatedMember;
    }

    return member;
  }

  const [newMember] = await db
    .insert(schema.familyMembers)
    .values({
      userId: userProfile.id,
      name: desiredName,
      avatar: userProfile.avatar,
      role: 'Owner',
      isPrimary: true,
    })
    .returning();

  return newMember;
}

/**
 * Verifies family member belongs to user
 */
export async function assertFamilyMemberOwnership(userProfileId: string, familyMemberId: string) {
  const [member] = await db
    .select()
    .from(schema.familyMembers)
    .where(
      and(
        eq(schema.familyMembers.id, familyMemberId),
        eq(schema.familyMembers.userId, userProfileId)
      )
    )
    .limit(1);

  if (!member) {
    throw new Error('Family member not found for this user');
  }

  return member;
}
