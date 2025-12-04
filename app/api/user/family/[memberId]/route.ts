/**
 * Family Member Update/Delete API
 * Handles updating and deleting individual family members
 *
 * @module app/api/user/family/[memberId]
 */

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { Errors } from "@/lib/api-errors";
import { logger } from "@/lib/logger";
import {
  UpdateFamilyMemberSchema,
  safeValidateSchema,
} from "@/lib/validations";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/**
 * Update family member details
 *
 * @route PATCH /api/user/family/[memberId]
 * @implements BR-003 - Family Member Ownership
 * @implements BR-005 - Partial Updates Allowed
 * @satisfies US-004 - Update Family Member
 * @tested __tests__/api/user/family.test.ts
 *
 * @param {Request} req - Contains partial family member data
 * @param {Object} params - Route parameters
 * @param {string} params.memberId - ID of family member to update
 * @returns {Promise<NextResponse>} Updated family member object
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ memberId: string }> },
) {
  const limited = await rateLimit(req, RATE_LIMITS.write);
  if (limited) return new Response("Too many requests", { status: 429 });

  const { memberId } = await params;
  try {
    const { userId } = await auth();
    if (!userId) return Errors.unauthorized();

    const userProfile = await prisma.userProfile.findUnique({
      where: { clerkId: userId },
    });
    if (!userProfile) return Errors.notFound("User profile");

    const body = await req.json();

    // Validate request body
    const validation = safeValidateSchema(UpdateFamilyMemberSchema, body);
    if (!validation.success) {
      return Errors.badRequest(
        validation.error.issues[0]?.message || "Invalid input",
      );
    }

    const { name, avatar, email } = validation.data;

    // Verify ownership
    const member = await prisma.familyMember.findFirst({
      where: {
        id: memberId,
        userId: userProfile.id,
      },
    });

    if (!member) return Errors.notFound("Family member");

    const updatedMember = await prisma.familyMember.update({
      where: { id: memberId },
      data: {
        ...(name && { name }),
        ...(avatar !== undefined && { avatar }),
        ...(email !== undefined && { email }),
      },
    });

    return NextResponse.json(updatedMember);
  } catch (error) {
    logger.error("Error updating family member", error, { memberId });
    return Errors.internal();
  }
}

/**
 * Delete a family member
 *
 * @route DELETE /api/user/family/[memberId]
 * @implements BR-003 - Family Member Ownership
 * @implements BR-006 - Primary Member Protection
 * @implements BR-007 - Bank Connection Dependency
 * @satisfies US-005 - Delete Family Member
 * @tested __tests__/api/user/family.test.ts
 *
 * @param {Request} req - HTTP request
 * @param {Object} params - Route parameters
 * @param {string} params.memberId - ID of family member to delete
 * @returns {Promise<NextResponse>} Success message or error
 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ memberId: string }> },
) {
  const limited = await rateLimit(req, RATE_LIMITS.sensitive);
  if (limited) return new Response("Too many requests", { status: 429 });

  const { memberId } = await params;
  try {
    const { userId } = await auth();
    if (!userId) return Errors.unauthorized();

    const userProfile = await prisma.userProfile.findUnique({
      where: { clerkId: userId },
    });
    if (!userProfile) return Errors.notFound("User profile");

    // Verify ownership
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

    if (!member) return Errors.notFound("Family member");

    // PROTECTION 1: Cannot delete Primary member
    if (member.isPrimary) {
      return Errors.badRequest("Cannot delete the primary family member");
    }

    // PROTECTION 2: Cannot delete member with linked items
    // We check this explicitly to give a better error message than the DB constraint
    if (member._count.plaidItems > 0) {
      return Errors.badRequest(
        `Cannot delete ${member.name} because they have ${member._count.plaidItems} active bank connection(s). Please reassign or remove the bank connections first.`,
      );
    }

    await prisma.familyMember.delete({
      where: { id: memberId },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    logger.error("Error deleting family member", error, { memberId });
    return Errors.internal();
  }
}
