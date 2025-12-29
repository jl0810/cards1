import { db, schema, eq, and } from "@/db";

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
 * Get user profile by Supabase ID
 */
export async function getUserProfile(supabaseId: string) {
  const userProfile = await db.query.userProfiles.findFirst({
    where: eq(schema.userProfiles.supabaseId, supabaseId),
  });

  if (!userProfile) {
    throw new UserNotFoundError(supabaseId);
  }

  return userProfile;
}

/**
 * Get all family members for a user
 */
export async function getFamilyMembers(supabaseId: string) {
  const userProfile = await getUserProfile(supabaseId);

  const familyMembersList = await db.query.familyMembers.findMany({
    where: eq(schema.familyMembers.userId, userProfile.id),
    orderBy: (familyMembers, { asc }) => [asc(familyMembers.createdAt)],
  });

  return familyMembersList;
}

/**
 * Create a new family member
 */
export async function createFamilyMember(
  supabaseId: string,
  data: {
    name: string;
    email?: string;
    avatar?: string;
    role?: string;
  },
) {
  const userProfile = await getUserProfile(supabaseId);

  const [familyMember] = await db
    .insert(schema.familyMembers)
    .values({
      name: data.name,
      email: data.email ?? null,
      avatar: data.avatar ?? null,
      role: data.role ?? "Member",
      userId: userProfile.id,
      isPrimary: false,
    })
    .returning();

  return familyMember;
}

/**
 * Update a family member
 */
export async function updateFamilyMember(
  supabaseId: string,
  memberId: string,
  data: {
    name?: string;
    email?: string;
    avatar?: string;
    role?: string;
  },
) {
  const userProfile = await getUserProfile(supabaseId);

  // Verify ownership
  const existingMember = await db.query.familyMembers.findFirst({
    where: and(
      eq(schema.familyMembers.id, memberId),
      eq(schema.familyMembers.userId, userProfile.id)
    ),
  });

  if (!existingMember) {
    throw new FamilyMemberNotFoundError(memberId);
  }

  const [updatedMember] = await db
    .update(schema.familyMembers)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(schema.familyMembers.id, memberId))
    .returning();

  return updatedMember;
}

/**
 * Delete a family member
 */
export async function deleteFamilyMember(supabaseId: string, memberId: string) {
  const userProfile = await getUserProfile(supabaseId);

  // Verify ownership and get member
  const existingMember = await db.query.familyMembers.findFirst({
    where: and(
      eq(schema.familyMembers.id, memberId),
      eq(schema.familyMembers.userId, userProfile.id)
    ),
  });

  if (!existingMember) {
    throw new FamilyMemberNotFoundError(memberId);
  }

  // BR-006: Primary member cannot be deleted
  if (existingMember.isPrimary) {
    throw new UnauthorizedAccessError("Cannot delete primary family member");
  }

  await db.delete(schema.familyMembers).where(eq(schema.familyMembers.id, memberId));
}

/**
 * Clean up corrupted avatar URLs from family members
 */
export async function cleanupCorruptedAvatars() {
  const allUserProfiles = await db.select().from(schema.userProfiles);
  const allFamilyMembersList = await db.select().from(schema.familyMembers);

  const corruptedPattern = /^[A-Za-z0-9+/]{20,}={0,2}$/; // Base64 pattern
  let cleanedCount = 0;

  console.log("Checking user profiles for corrupted data...");

  // Check UserProfile table
  for (const profile of allUserProfiles) {
    let needsUpdate = false;
    const updates: Record<string, unknown> = {};

    if (profile.name && corruptedPattern.test(profile.name)) {
      updates.name = "Unknown User";
      needsUpdate = true;
    }

    if (profile.avatar && corruptedPattern.test(profile.avatar)) {
      updates.avatar = null;
      needsUpdate = true;
    }

    if (needsUpdate) {
      await db
        .update(schema.userProfiles)
        .set({
          ...updates as any,
          updatedAt: new Date(),
        })
        .where(eq(schema.userProfiles.id, profile.id));
      cleanedCount++;
    }
  }

  console.log("Checking family members for corrupted data...");

  // Check FamilyMember table
  for (const member of allFamilyMembersList) {
    let needsUpdate = false;
    const updates: Record<string, unknown> = {};

    if (member.name && corruptedPattern.test(member.name)) {
      updates.name = "Unknown Member";
      needsUpdate = true;
    }

    if (member.avatar && corruptedPattern.test(member.avatar)) {
      updates.avatar = null;
      needsUpdate = true;
    }

    if (member.email && corruptedPattern.test(member.email)) {
      updates.email = null;
      needsUpdate = true;
    }

    if (needsUpdate) {
      await db
        .update(schema.familyMembers)
        .set({
          ...updates as any,
          updatedAt: new Date(),
        })
        .where(eq(schema.familyMembers.id, member.id));
      cleanedCount++;
    }
  }

  return { count: cleanedCount };
}
