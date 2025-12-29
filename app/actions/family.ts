"use server";

/**
 * Family Member Server Actions
 * Handles family member CRUD operations
 *
 * @module app/actions/family
 * @implements BR-003 - Family Member Ownership
 * @implements BR-004 - Family Member Name Requirements
 * @implements BR-006 - Primary Member Protection
 * @implements BR-007 - Bank Connection Dependency
 * @satisfies US-003 - Add Family Members
 * @satisfies US-004 - Update Family Member
 * @satisfies US-005 - Delete Family Member
 * @satisfies US-030 - Manage Family Member Names
 */

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import * as Sentry from "@sentry/nextjs";
import {
  getFamilyMembers,
  createFamilyMember,
  UserNotFoundError,
} from "@/lib/family-operations";

// ============================================================================
// Schemas
// ============================================================================

const CreateFamilyMemberSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  email: z.string().email().optional().nullable(),
  avatar: z.string().url().optional().nullable(),
  role: z.string().max(50).optional(),
});

const UpdateFamilyMemberSchema = z.object({
  memberId: z.string().min(1, "Member ID is required"),
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().optional().nullable(),
  avatar: z.string().url().optional().nullable(),
});

const DeleteFamilyMemberSchema = z.object({
  memberId: z.string().min(1, "Member ID is required"),
});

// ============================================================================
// Types
// ============================================================================

type ActionResult<T = unknown> =
  | { success: true; data: T }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> };

// ============================================================================
// Actions
// ============================================================================

/**
 * Create a new family member
 *
 * @implements BR-003 - Family Member Ownership
 * @implements BR-004 - Family Member Name Requirements
 * @satisfies US-003 - Add Family Members
 */
export async function addFamilyMember(
  input: z.infer<typeof CreateFamilyMemberSchema>,
): Promise<ActionResult<{ id: string; name: string }>> {
  // 1. Auth Check
  const { userId } = await auth();
  if (!userId) {
    return { success: false, error: "Unauthorized" };
  }

  // 2. Validation
  const validated = CreateFamilyMemberSchema.safeParse(input);
  if (!validated.success) {
    return {
      success: false,
      error: "Validation failed",
      fieldErrors: validated.error.flatten().fieldErrors,
    };
  }

  const { name, email, avatar, role } = validated.data;

  try {
    // 3. Create family member using existing business logic
    const familyMember = await createFamilyMember(userId, {
      name,
      email: email ?? undefined,
      avatar: avatar ?? undefined,
      role,
    });

    // 4. Revalidate
    revalidatePath("/dashboard");
    revalidatePath("/settings");

    logger.info("Family member created", {
      userId,
      memberId: familyMember.id,
      memberName: name,
    });

    return {
      success: true,
      data: { id: familyMember.id, name: familyMember.name },
    };
  } catch (error) {
    if (error instanceof UserNotFoundError) {
      return { success: false, error: "User profile not found" };
    }
    Sentry.captureException(error, {
      user: { id: userId },
      extra: { action: "addFamilyMember", name },
    });
    logger.error("Error creating family member", error, { userId, name });
    return { success: false, error: "Failed to create family member" };
  }
}

/**
 * Update a family member
 *
 * @implements BR-003 - Family Member Ownership
 * @implements BR-005 - Partial Updates Allowed
 * @satisfies US-004 - Update Family Member
 */
export async function updateFamilyMember(
  input: z.infer<typeof UpdateFamilyMemberSchema>,
): Promise<ActionResult<{ id: string; name: string }>> {
  // 1. Auth Check
  const { userId } = await auth();
  if (!userId) {
    return { success: false, error: "Unauthorized" };
  }

  // 2. Validation
  const validated = UpdateFamilyMemberSchema.safeParse(input);
  if (!validated.success) {
    return {
      success: false,
      error: "Validation failed",
      fieldErrors: validated.error.flatten().fieldErrors,
    };
  }

  const { memberId, name, email, avatar } = validated.data;

  try {
    // 3. Verify ownership
    const userProfile = await prisma.userProfile.findUnique({
      where: { clerkId: userId },
    });

    if (!userProfile) {
      return { success: false, error: "User profile not found" };
    }

    const member = await prisma.familyMember.findFirst({
      where: {
        id: memberId,
        userId: userProfile.id,
      },
    });

    if (!member) {
      return { success: false, error: "Family member not found" };
    }

    // 4. Update
    const updatedMember = await prisma.familyMember.update({
      where: { id: memberId },
      data: {
        ...(name && { name }),
        ...(email !== undefined && { email }),
        ...(avatar !== undefined && { avatar }),
      },
    });

    // 5. Revalidate
    revalidatePath("/dashboard");
    revalidatePath("/settings");

    logger.info("Family member updated", { userId, memberId });

    return {
      success: true,
      data: { id: updatedMember.id, name: updatedMember.name },
    };
  } catch (error) {
    Sentry.captureException(error, {
      user: { id: userId },
      extra: { action: "updateFamilyMember", memberId },
    });
    logger.error("Error updating family member", error, { userId, memberId });
    return { success: false, error: "Failed to update family member" };
  }
}

/**
 * Delete a family member
 *
 * @implements BR-003 - Family Member Ownership
 * @implements BR-006 - Primary Member Protection
 * @implements BR-007 - Bank Connection Dependency
 * @satisfies US-005 - Delete Family Member
 */
export async function deleteFamilyMember(
  input: z.infer<typeof DeleteFamilyMemberSchema>,
): Promise<ActionResult<{ deleted: true }>> {
  // 1. Auth Check
  const { userId } = await auth();
  if (!userId) {
    return { success: false, error: "Unauthorized" };
  }

  // 2. Validation
  const validated = DeleteFamilyMemberSchema.safeParse(input);
  if (!validated.success) {
    return {
      success: false,
      error: "Validation failed",
      fieldErrors: validated.error.flatten().fieldErrors,
    };
  }

  const { memberId } = validated.data;

  try {
    // 3. Verify ownership
    const userProfile = await prisma.userProfile.findUnique({
      where: { clerkId: userId },
    });

    if (!userProfile) {
      return { success: false, error: "User profile not found" };
    }

    const member = await prisma.familyMember.findFirst({
      where: {
        id: memberId,
        userId: userProfile.id,
      },
      include: {
        _count: {
          select: { plaidItems: true },
        },
      },
    });

    if (!member) {
      return { success: false, error: "Family member not found" };
    }

    // 4. Business rule checks
    if (member.isPrimary) {
      return {
        success: false,
        error: "Cannot delete the primary family member",
      };
    }

    if (member._count.plaidItems > 0) {
      return {
        success: false,
        error: `Cannot delete ${member.name} because they have ${member._count.plaidItems} active bank connection(s). Please reassign or remove the bank connections first.`,
      };
    }

    // 5. Delete
    await prisma.familyMember.delete({
      where: { id: memberId },
    });

    // 6. Revalidate
    revalidatePath("/dashboard");
    revalidatePath("/settings");

    logger.info("Family member deleted", { userId, memberId });

    return {
      success: true,
      data: { deleted: true },
    };
  } catch (error) {
    Sentry.captureException(error, {
      user: { id: userId },
      extra: { action: "deleteFamilyMember", memberId },
    });
    logger.error("Error deleting family member", error, { userId, memberId });
    return { success: false, error: "Failed to delete family member" };
  }
}

/**
 * Get all family members (can be called from client)
 * Note: This is a read operation, but useful as a server action for consistency
 */
export async function listFamilyMembers(): Promise<
  ActionResult<Array<{ id: string; name: string; isPrimary: boolean }>>
> {
  const { userId } = await auth();
  if (!userId) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const members = await getFamilyMembers(userId);
    return {
      success: true,
      data: members.map((m) => ({
        id: m.id,
        name: m.name,
        isPrimary: m.isPrimary,
      })),
    };
  } catch (error) {
    if (error instanceof UserNotFoundError) {
      return { success: false, error: "User profile not found" };
    }
    logger.error("Error fetching family members", error, { userId });
    return { success: false, error: "Failed to fetch family members" };
  }
}
