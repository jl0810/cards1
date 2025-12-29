/**
 * Family Member Update/Delete API
 * Handles updating and deleting individual family members
 *
 * @module app/api/user/family/[memberId]
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, schema, eq, and } from "@/db";
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
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ memberId: string }> },
) {
  const limited = await rateLimit(req, RATE_LIMITS.write);
  if (limited) return new Response("Too many requests", { status: 429 });

  const { memberId } = await params;
  try {
    const session = await auth();
    const user = session?.user;
    if (!user?.id) return Errors.unauthorized();

    const userProfile = await db.query.userProfiles.findFirst({
      where: eq(schema.userProfiles.supabaseId, user.id),
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
    const member = await db.query.familyMembers.findFirst({
      where: and(
        eq(schema.familyMembers.id, memberId),
        eq(schema.familyMembers.userId, userProfile.id)
      ),
    });

    if (!member) return Errors.notFound("Family member");

    const [updatedMember] = await db.update(schema.familyMembers)
      .set({
        ...(name && { name }),
        ...(avatar !== undefined && { avatar }),
        ...(email !== undefined && { email }),
        updatedAt: new Date(),
      })
      .where(eq(schema.familyMembers.id, memberId))
      .returning();

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
 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ memberId: string }> },
) {
  const limited = await rateLimit(req, RATE_LIMITS.sensitive);
  if (limited) return new Response("Too many requests", { status: 429 });

  const { memberId } = await params;
  try {
    const session = await auth();
    const user = session?.user;
    if (!user?.id) return Errors.unauthorized();

    const userProfile = await db.query.userProfiles.findFirst({
      where: eq(schema.userProfiles.supabaseId, user.id),
    });
    if (!userProfile) return Errors.notFound("User profile");

    // Verify ownership and check plaidItems
    const member = await db.query.familyMembers.findFirst({
      where: and(
        eq(schema.familyMembers.id, memberId),
        eq(schema.familyMembers.userId, userProfile.id)
      ),
      with: {
        plaidItems: true,
      }
    });

    if (!member) return Errors.notFound("Family member");

    // PROTECTION 1: Cannot delete Primary member
    if (member.isPrimary) {
      return Errors.badRequest("Cannot delete the primary family member");
    }

    // PROTECTION 2: Cannot delete member with linked items
    if (member.plaidItems.length > 0) {
      return Errors.badRequest(
        `Cannot delete ${member.name} because they have ${member.plaidItems.length} active bank connection(s). Please reassign or remove the bank connections first.`,
      );
    }

    await db.delete(schema.familyMembers).where(eq(schema.familyMembers.id, memberId));

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    logger.error("Error deleting family member", error, { memberId });
    return Errors.internal();
  }
}
