"use server";

/**
 * User Preferences Server Actions
 * Handles user settings and preferences
 *
 * @module app/actions/preferences
 * @implements BR-019 - User Preferences
 * @satisfies US-013 - User Settings
 */

"use server";

import { auth } from "@/lib/auth";
import { db, schema, eq } from "@/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { logger } from "@/lib/logger";

// ============================================================================
// Schemas
// ============================================================================

const UpdatePreferencesSchema = z.object({
  theme: z.enum(["light", "dark", "system"]).optional(),
  language: z.string().max(10).optional(),
  timezone: z.string().max(50).optional(),
  emailNotifications: z.boolean().optional(),
  pushNotifications: z.boolean().optional(),
  defaultDashboard: z.string().max(50).optional(),
  sidebarCollapsed: z.boolean().optional(),
  betaFeatures: z.boolean().optional(),
  analyticsSharing: z.boolean().optional(),
});

// ============================================================================
// Types
// ============================================================================

type ActionResult<T = unknown> =
  | { success: true; data: T }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> };

interface UserPreferences {
  theme: string;
  language: string;
  timezone: string;
  emailNotifications: boolean;
  pushNotifications: boolean;
  defaultDashboard: string;
  sidebarCollapsed: boolean;
  betaFeatures: boolean;
  analyticsSharing: boolean;
}

// ============================================================================
// Actions
// ============================================================================

/**
 * Update user preferences
 */
export async function updatePreferences(
  input: z.infer<typeof UpdatePreferencesSchema>,
): Promise<ActionResult<UserPreferences>> {
  const session = await auth();
  const user = session?.user;
  if (!user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  // 2. Validation
  const validated = UpdatePreferencesSchema.safeParse(input);
  if (!validated.success) {
    return {
      success: false,
      error: "Validation failed",
      fieldErrors: validated.error.flatten().fieldErrors,
    };
  }

  const preferences = validated.data;

  try {
    // 3. Update preferences using Drizzle upsert
    const [updatedProfile] = await db
      .insert(schema.userProfiles)
      .values({
        supabaseId: user.id,
        theme: preferences.theme ?? "system",
        language: preferences.language ?? "en",
        timezone: preferences.timezone ?? "UTC",
        emailNotifications: preferences.emailNotifications ?? true,
        pushNotifications: preferences.pushNotifications ?? false,
        defaultDashboard: preferences.defaultDashboard ?? "main",
        sidebarCollapsed: preferences.sidebarCollapsed ?? false,
        betaFeatures: preferences.betaFeatures ?? false,
        analyticsSharing: preferences.analyticsSharing ?? true,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: schema.userProfiles.supabaseId,
        set: {
          ...(preferences.theme && { theme: preferences.theme }),
          ...(preferences.language && { language: preferences.language }),
          ...(preferences.timezone && { timezone: preferences.timezone }),
          ...(preferences.emailNotifications !== undefined && {
            emailNotifications: preferences.emailNotifications,
          }),
          ...(preferences.pushNotifications !== undefined && {
            pushNotifications: preferences.pushNotifications,
          }),
          ...(preferences.defaultDashboard && {
            defaultDashboard: preferences.defaultDashboard,
          }),
          ...(preferences.sidebarCollapsed !== undefined && {
            sidebarCollapsed: preferences.sidebarCollapsed,
          }),
          ...(preferences.betaFeatures !== undefined && {
            betaFeatures: preferences.betaFeatures,
          }),
          ...(preferences.analyticsSharing !== undefined && {
            analyticsSharing: preferences.analyticsSharing,
          }),
          updatedAt: new Date(),
        },
      })
      .returning();

    // 4. Revalidate
    revalidatePath("/settings");
    revalidatePath("/dashboard");

    logger.info("User preferences updated", { userId: user.id });

    return {
      success: true,
      data: {
        theme: updatedProfile.theme ?? "system",
        language: updatedProfile.language ?? "en",
        timezone: updatedProfile.timezone ?? "UTC",
        emailNotifications: updatedProfile.emailNotifications ?? true,
        pushNotifications: updatedProfile.pushNotifications ?? false,
        defaultDashboard: updatedProfile.defaultDashboard ?? "main",
        sidebarCollapsed: updatedProfile.sidebarCollapsed ?? false,
        betaFeatures: updatedProfile.betaFeatures ?? false,
        analyticsSharing: updatedProfile.analyticsSharing ?? true,
      },
    };
  } catch (error) {
    console.error(error, {
      user: { id: user.id },
      extra: { action: "updatePreferences" },
    });
    logger.error("Error updating preferences", error, { userId: user.id });
    return { success: false, error: "Failed to update preferences" };
  }
}

/**
 * Get user preferences
 */
export async function getPreferences(): Promise<ActionResult<UserPreferences>> {
  const session = await auth();
  const user = session?.user;
  if (!user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const userProfile = await db.query.userProfiles.findFirst({
      where: eq(schema.userProfiles.supabaseId, user.id),
    });

    if (!userProfile) {
      // Return defaults for new user
      return {
        success: true,
        data: {
          theme: "system",
          language: "en",
          timezone: "UTC",
          emailNotifications: true,
          pushNotifications: false,
          defaultDashboard: "main",
          sidebarCollapsed: false,
          betaFeatures: false,
          analyticsSharing: true,
        },
      };
    }

    return {
      success: true,
      data: {
        theme: userProfile.theme ?? "system",
        language: userProfile.language ?? "en",
        timezone: userProfile.timezone ?? "UTC",
        emailNotifications: userProfile.emailNotifications ?? true,
        pushNotifications: userProfile.pushNotifications ?? false,
        defaultDashboard: userProfile.defaultDashboard ?? "main",
        sidebarCollapsed: userProfile.sidebarCollapsed ?? false,
        betaFeatures: userProfile.betaFeatures ?? false,
        analyticsSharing: userProfile.analyticsSharing ?? true,
      },
    };
  } catch (error) {
    logger.error("Error fetching preferences", error, { userId: user.id });
    return { success: false, error: "Failed to fetch preferences" };
  }
}
