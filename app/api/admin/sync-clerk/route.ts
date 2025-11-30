/**
 * Admin API: Manual Clerk Sync
 * Syncs current user or all users from Clerk to database
 *
 * @module app/api/admin/sync-clerk
 * @implements BR-001 - User Profile Creation
 */

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { syncClerkUser, syncAllClerkUsers } from "@/lib/clerk-sync";
import { Errors, successResponse } from "@/lib/api-errors";
import { logger } from "@/lib/logger";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/**
 * Sync current user from Clerk
 *
 * @route POST /api/admin/sync-clerk
 * @implements BR-001 - User Profile Creation
 * @tested None
 *
 * @returns {Promise<NextResponse>} Synced user profile
 */
export async function POST(req: Request) {
  const limited = await rateLimit(req, RATE_LIMITS.write);
  if (limited) return new Response("Too many requests", { status: 429 });

  try {
    const { userId } = await auth();

    if (!userId) {
      return Errors.unauthorized();
    }

    const { syncAll } = await req.json().catch(() => ({ syncAll: false }));

    if (syncAll) {
      // Sync all users (admin only - add permission check here)
      logger.info("Admin sync all users requested", { requestedBy: userId });
      const results = await syncAllClerkUsers();
      return successResponse(results);
    } else {
      // Sync current user
      logger.info("User sync requested", { userId });
      const profile = await syncClerkUser(userId);
      return successResponse({
        clerkId: profile.clerkId,
        profileId: profile.id,
        name: profile.name,
        familyMembers: profile.familyMembers?.length || 0,
      });
    }
  } catch (error) {
    logger.error("Sync failed", error);
    return Errors.internal(
      error instanceof Error ? error.message : "Sync failed",
    );
  }
}

/**
 * Get sync status for current user
 *
 * @route GET /api/admin/sync-clerk
 * @returns {Promise<NextResponse>} Sync status
 */
export async function GET(req: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return Errors.unauthorized();
    }

    const { prisma } = await import("@/lib/prisma");

    // Check if user exists in database
    const userProfile = await prisma.userProfile.findUnique({
      where: { clerkId: userId },
      include: {
        familyMembers: true,
        plaidItems: true,
      },
    });

    if (!userProfile) {
      return successResponse({
        synced: false,
        clerkId: userId,
        message:
          'User not found in database. Click "Sync Now" to create profile.',
      });
    }

    return successResponse({
      synced: true,
      clerkId: userId,
      profileId: userProfile.id,
      name: userProfile.name,
      familyMembers: userProfile.familyMembers.length,
      plaidItems: userProfile.plaidItems.length,
      hasPrimaryMember: userProfile.familyMembers.some((m) => m.isPrimary),
    });
  } catch (error) {
    logger.error("Failed to check sync status", error);
    return Errors.internal(
      error instanceof Error ? error.message : "Failed to check status",
    );
  }
}
