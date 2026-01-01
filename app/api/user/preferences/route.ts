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
import { publicSchema } from "@jl0810/db-client";
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

    // Get user profile with preferences (joined from public schema)
    const userProfile = await db.query.userProfiles.findFirst({
      where: eq(schema.userProfiles.supabaseId, user.id),
      with: {
        preferences: true,
      },
    });

    if (!userProfile) {
      return Errors.notFound("User profile not found");
    }

    const prefs = userProfile.preferences || {};

    return NextResponse.json({
      theme: prefs.theme || "system",
      language: prefs.language || "en",
      timezone: prefs.timezone || "UTC",
      emailNotifications: prefs.emailNotifications ?? true,
      pushNotifications: prefs.pushNotifications ?? false,
      marketingEmails: prefs.marketingEmails ?? false,
      defaultDashboard: prefs.defaultDashboard || "main",
      sidebarCollapsed: prefs.sidebarCollapsed ?? false,
      compactMode: prefs.compactMode ?? false,
      betaFeatures: prefs.betaFeatures ?? false,
      analyticsSharing: prefs.analyticsSharing ?? true,
      crashReporting: prefs.crashReporting ?? true,
      autoSave: prefs.autoSave ?? true,
      keyboardShortcuts: prefs.keyboardShortcuts ?? true,
      soundEffects: prefs.soundEffects ?? false,
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

    // Check if preferences exist
    const existingPrefs = await db.query.userPreferences.findFirst({
      where: eq(publicSchema.userPreferences.userId, user.id),
    });

    const prefsData = {
      theme: preferences.theme,
      language: preferences.language,
      timezone: preferences.timezone,
      emailNotifications: preferences.emailNotifications,
      pushNotifications: preferences.pushNotifications,
      updatedAt: new Date(),
    };

    let updatedPrefs;

    if (existingPrefs) {
      [updatedPrefs] = await db
        .update(publicSchema.userPreferences)
        .set(prefsData)
        .where(eq(publicSchema.userPreferences.userId, user.id))
        .returning();
    } else {
      [updatedPrefs] = await db
        .insert(publicSchema.userPreferences)
        .values({
          userId: user.id,
          ...prefsData,
        })
        .returning();
    }

    return NextResponse.json({
      message: "Preferences updated successfully",
      preferences: {
        theme: updatedPrefs.theme,
        language: updatedPrefs.language,
        timezone: updatedPrefs.timezone,
        emailNotifications: updatedPrefs.emailNotifications,
        pushNotifications: updatedPrefs.pushNotifications,
        marketingEmails: updatedPrefs.marketingEmails,
        defaultDashboard: updatedPrefs.defaultDashboard,
        sidebarCollapsed: updatedPrefs.sidebarCollapsed,
        compactMode: updatedPrefs.compactMode,
        betaFeatures: updatedPrefs.betaFeatures,
        analyticsSharing: updatedPrefs.analyticsSharing,
        crashReporting: updatedPrefs.crashReporting,
        autoSave: updatedPrefs.autoSave,
        keyboardShortcuts: updatedPrefs.keyboardShortcuts,
        soundEffects: updatedPrefs.soundEffects,
      }
    });

  } catch (error) {
    logger.error("Error updating user preferences:", error);
    return Errors.internal();
  }
}
