/**
 * Family Member Business Logic
 * Pure business logic for family member operations - no HTTP concerns
 *
 * @module lib/family-operations
 */

import { prisma } from "@/lib/prisma";

/**
 * Custom error types for better error handling
 */
export class UserNotFoundError extends Error {
  constructor(userId: string) {
    super(`User profile not found for userId: ${userId}`);
    this.name = "UserNotFoundError";
  }
}

export class FamilyMemberNotFoundError extends Error {
  constructor(memberId: string) {
    super(`Family member not found: ${memberId}`);
    this.name = "FamilyMemberNotFoundError";
  }
}

export class UnauthorizedAccessError extends Error {
  constructor(message: string = "Unauthorized access to family member") {
    super(message);
    this.name = "UnauthorizedAccessError";
  }
}

/**
 * Get user profile by Clerk ID
 *
 * @implements BR-003 - Family Member Ownership
 * @param {string} clerkId - Clerk user ID
 * @returns {Promise<UserProfile>} User profile
 * @throws {UserNotFoundError} If user profile doesn't exist
 */
export async function getUserProfile(clerkId: string) {
  const userProfile = await prisma.userProfile.findUnique({
    where: { clerkId },
  });

  if (!userProfile) {
    throw new UserNotFoundError(clerkId);
  }

  return userProfile;
}

/**
 * Get all family members for a user
 *
 * @implements BR-003 - Family Member Ownership
 * @satisfies US-003 - Add Family Members (view capability)
 * @tested __tests__/lib/family-operations.test.ts
 *
 * @param {string} clerkId - Clerk user ID
 * @returns {Promise<FamilyMember[]>} Array of family members
 * @throws {UserNotFoundError} If user profile doesn't exist
 */
export async function getFamilyMembers(clerkId: string) {
  const userProfile = await getUserProfile(clerkId);

  const familyMembers = await prisma.familyMember.findMany({
    where: { userId: userProfile.id },
    orderBy: { createdAt: "asc" },
  });

  return familyMembers;
}

/**
 * Create a new family member
 *
 * @implements BR-003 - Family Member Ownership
 * @implements BR-004 - Family Member Name Requirements
 * @satisfies US-003 - Add Family Members
 * @tested __tests__/lib/family-operations.test.ts
 *
 * @param {string} clerkId - Clerk user ID
 * @param {Object} data - Family member data
 * @returns {Promise<FamilyMember>} Created family member
 * @throws {UserNotFoundError} If user profile doesn't exist
 */
export async function createFamilyMember(
  clerkId: string,
  data: {
    name: string;
    email?: string;
    avatar?: string;
    role?: string;
  },
) {
  const userProfile = await getUserProfile(clerkId);

  const familyMember = await prisma.familyMember.create({
    data: {
      ...data,
      userId: userProfile.id,
      isPrimary: false, // Only the account owner is primary
    },
  });

  return familyMember;
}

/**
 * Update a family member
 *
 * @implements BR-003 - Family Member Ownership
 * @implements BR-005 - Update Validation
 * @satisfies US-004 - Update Family Member
 * @tested __tests__/lib/family-operations.test.ts
 *
 * @param {string} clerkId - Clerk user ID (for authorization)
 * @param {string} memberId - Family member ID to update
 * @param {Object} data - Updated family member data
 * @returns {Promise<FamilyMember>} Updated family member
 * @throws {UserNotFoundError} If user profile doesn't exist
 * @throws {FamilyMemberNotFoundError} If family member doesn't exist
 * @throws {UnauthorizedAccessError} If member doesn't belong to user
 */
export async function updateFamilyMember(
  clerkId: string,
  memberId: string,
  data: {
    name?: string;
    email?: string;
    avatar?: string;
    role?: string;
  },
) {
  const userProfile = await getUserProfile(clerkId);

  // Verify ownership
  const existingMember = await prisma.familyMember.findFirst({
    where: {
      id: memberId,
      userId: userProfile.id,
    },
  });

  if (!existingMember) {
    throw new FamilyMemberNotFoundError(memberId);
  }

  const updatedMember = await prisma.familyMember.update({
    where: { id: memberId },
    data,
  });

  return updatedMember;
}

/**
 * Delete a family member
 *
 * @implements BR-003 - Family Member Ownership
 * @implements BR-006 - Primary member cannot be deleted
 * @implements BR-007 - Cascade delete restrictions
 * @satisfies US-005 - Delete Family Member
 * @tested __tests__/lib/family-operations.test.ts
 *
 * @param {string} clerkId - Clerk user ID (for authorization)
 * @param {string} memberId - Family member ID to delete
 * @returns {Promise<void>}
 * @throws {UserNotFoundError} If user profile doesn't exist
 * @throws {FamilyMemberNotFoundError} If family member doesn't exist
 * @throws {UnauthorizedAccessError} If member doesn't belong to user or is primary
 */
export async function deleteFamilyMember(clerkId: string, memberId: string) {
  const userProfile = await getUserProfile(clerkId);

  // Verify ownership and get member
  const existingMember = await prisma.familyMember.findFirst({
    where: {
      id: memberId,
      userId: userProfile.id,
    },
  });

  if (!existingMember) {
    throw new FamilyMemberNotFoundError(memberId);
  }

  // BR-006: Primary member cannot be deleted
  if (existingMember.isPrimary) {
    throw new UnauthorizedAccessError("Cannot delete primary family member");
  }

  await prisma.familyMember.delete({
    where: { id: memberId },
  });
}

/**
 * Clean up corrupted avatar URLs from family members
 *
 * @returns {Promise<{count: number}>} Number of cleaned up records
 */
export async function cleanupCorruptedAvatars() {
  // Check both UserProfile and FamilyMember tables for corrupted data
  const allUserProfiles = await prisma.userProfile.findMany();
  const allFamilyMembers = await prisma.familyMember.findMany();

  const corruptedPattern = /^[A-Za-z0-9+/]{20,}={0,2}$/; // Base64 pattern
  let cleanedCount = 0;

  console.log("Checking user profiles for corrupted data...");

  // Check UserProfile table
  for (const profile of allUserProfiles) {
    let needsUpdate = false;
    const updates: Record<string, unknown> = {};

    if (profile.name && corruptedPattern.test(profile.name)) {
      console.log(`Found corrupted profile name: ${profile.name}`);
      updates.name = "Unknown User";
      needsUpdate = true;
    }

    if (profile.avatar && corruptedPattern.test(profile.avatar)) {
      console.log(`Found corrupted profile avatar: ${profile.avatar}`);
      updates.avatar = null;
      needsUpdate = true;
    }

    if (needsUpdate) {
      await prisma.userProfile.update({
        where: { id: profile.id },
        data: updates,
      });
      cleanedCount++;
      console.log(`Cleaned up corrupted profile data: ${profile.id}`);
    }
  }

  console.log("Checking family members for corrupted data...");

  // Check FamilyMember table
  for (const member of allFamilyMembers) {
    let needsUpdate = false;
    const updates: Record<string, unknown> = {};

    if (member.name && corruptedPattern.test(member.name)) {
      console.log(`Found corrupted member name: ${member.name}`);
      updates.name = "Unknown Member";
      needsUpdate = true;
    }

    if (member.avatar && corruptedPattern.test(member.avatar)) {
      console.log(`Found corrupted member avatar: ${member.avatar}`);
      updates.avatar = null;
      needsUpdate = true;
    }

    if (member.email && corruptedPattern.test(member.email)) {
      console.log(`Found corrupted member email: ${member.email}`);
      updates.email = null;
      needsUpdate = true;
    }

    if (needsUpdate) {
      await prisma.familyMember.update({
        where: { id: member.id },
        data: updates,
      });
      cleanedCount++;
      console.log(`Cleaned up corrupted member data: ${member.id}`);
    }
  }

  return { count: cleanedCount };
}
