/**
 * User Preferences API
 * Get and update user settings
 * 
 * @module app/api/user/preferences
 * @implements BR-019 - User Preferences
 * @satisfies US-013 - User Settings
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, schema, eq } from "@/db";
import { UpdateUserPreferencesSchema, safeValidateSchema } from "@/lib/validations";
import { Errors } from "@/lib/api-errors";
import { logger } from "@/lib/logger";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/**
 * Get user preferences
 * @route GET /api/user/preferences
 */
export async function GET() {
  try {
    const session = await auth();
    const user = session?.user;

    if (!user?.id) {
      return Errors.unauthorized();
    }

    // Get user preferences from DB using Drizzle
    let userProfile = await db.query.userProfiles.findFirst({
      where: eq(schema.userProfiles.supabaseId, user.id),
    });

    if (!userProfile) {
      // Create default profile for new user
      const [newProfile] = await db.insert(schema.userProfiles)
        .values({
          supabaseId: user.id,
          name: user.email?.split("@")[0] || "User",
        })
        .returning();

      userProfile = newProfile;
    }

    return NextResponse.json({
      theme: userProfile.theme,
      language: userProfile.language,
      timezone: userProfile.timezone,
      emailNotifications: userProfile.emailNotifications,
      pushNotifications: userProfile.pushNotifications,
      marketingEmails: userProfile.marketingEmails,
      defaultDashboard: userProfile.defaultDashboard,
      sidebarCollapsed: userProfile.sidebarCollapsed,
      compactMode: userProfile.compactMode,
      betaFeatures: userProfile.betaFeatures,
      analyticsSharing: userProfile.analyticsSharing,
      crashReporting: userProfile.crashReporting,
      autoSave: userProfile.autoSave,
      keyboardShortcuts: userProfile.keyboardShortcuts,
      soundEffects: userProfile.soundEffects,
    });

  } catch (error) {
    logger.error("Error fetching user preferences:", error);
    return Errors.internal();
  }
}

/**
 * Update user preferences
 * @route PUT /api/user/preferences
 */
export async function PUT(request: NextRequest) {
  const limited = await rateLimit(request, RATE_LIMITS.write);
  if (limited) {
    return new Response("Too many requests", { status: 429 });
  }

  try {
    const session = await auth();
    const user = session?.user;

    if (!user?.id) {
      return Errors.unauthorized();
    }

    const body = await request.json();
    const validation = safeValidateSchema(UpdateUserPreferencesSchema, body);
    if (!validation.success) {
      return Errors.badRequest("Invalid preferences data");
    }

    const preferences = validation.data;

    // Update user preferences using Drizzle upsert (onConflictDoUpdate)
    const [updatedProfile] = await db.insert(schema.userProfiles)
      .values({
        supabaseId: user.id,
        theme: preferences.theme,
        language: preferences.language,
        timezone: preferences.timezone,
        emailNotifications: preferences.emailNotifications,
        pushNotifications: preferences.pushNotifications,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: schema.userProfiles.supabaseId,
        set: {
          theme: preferences.theme,
          language: preferences.language,
          timezone: preferences.timezone,
          emailNotifications: preferences.emailNotifications,
          pushNotifications: preferences.pushNotifications,
          updatedAt: new Date(),
        },
      })
      .returning();

    return NextResponse.json({
      message: "Preferences updated successfully",
      preferences: {
        theme: updatedProfile.theme,
        language: updatedProfile.language,
        timezone: updatedProfile.timezone,
        emailNotifications: updatedProfile.emailNotifications,
        pushNotifications: updatedProfile.pushNotifications,
        marketingEmails: updatedProfile.marketingEmails,
        defaultDashboard: updatedProfile.defaultDashboard,
        sidebarCollapsed: updatedProfile.sidebarCollapsed,
        compactMode: updatedProfile.compactMode,
        betaFeatures: updatedProfile.betaFeatures,
        analyticsSharing: updatedProfile.analyticsSharing,
        crashReporting: updatedProfile.crashReporting,
        autoSave: updatedProfile.autoSave,
        keyboardShortcuts: updatedProfile.keyboardShortcuts,
        soundEffects: updatedProfile.soundEffects,
      }
    });

  } catch (error) {
    logger.error("Error updating user preferences:", error);
    return Errors.internal();
  }
}
