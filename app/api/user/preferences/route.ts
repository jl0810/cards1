/**
 * User Preferences API
 * Get and update user settings
 * 
 * @module app/api/user/preferences
 * @implements BR-019 - User Preferences
 * @satisfies US-013 - User Settings
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { UserProfileExtendedSchema, UpdateUserPreferencesSchema, safeValidateSchema } from '@/lib/validations';
import { Errors } from '@/lib/api-errors';
import { logger } from '@/lib/logger';
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import type { z } from 'zod';

type UserProfileExtended = z.infer<typeof UserProfileExtendedSchema>;

/**
 * Get user preferences
 * @route GET /api/user/preferences
 */
export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return Errors.unauthorized();
    }

    // Get user preferences from Supabase
    const userProfile = await prisma.userProfile.findUnique({
      where: { clerkId: userId },
    });

    if (!userProfile) {
      // Create default preferences for new user
      const defaultProfile = await prisma.userProfile.create({
        data: {
          clerkId: userId,
        },
      });

      return NextResponse.json({
        theme: defaultProfile.theme || 'system',
        language: defaultProfile.language || 'en',
        timezone: defaultProfile.timezone || 'UTC',
        emailNotifications: defaultProfile.emailNotifications ?? true,
        pushNotifications: defaultProfile.pushNotifications ?? false,
        marketingEmails: false, // Default since not in schema
        newsletter: false, // Map to marketing emails
        notifications: defaultProfile.pushNotifications ?? false, // Map to push notifications
        defaultDashboard: (defaultProfile as UserProfileExtended).defaultDashboard || 'main',
        sidebarCollapsed: (defaultProfile as UserProfileExtended).sidebarCollapsed ?? false,
        compactMode: false, // Default since not in schema
        betaFeatures: (defaultProfile as UserProfileExtended).betaFeatures ?? false,
        analyticsSharing: (defaultProfile as UserProfileExtended).analyticsSharing ?? true,
        crashReporting: true, // Default since not in schema
        autoSave: true, // Default since not in schema
        keyboardShortcuts: true, // Default since not in schema
        soundEffects: false, // Default since not in schema
      });
    }

    return NextResponse.json({
      theme: userProfile.theme,
      language: userProfile.language,
      timezone: userProfile.timezone,
      emailNotifications: userProfile.emailNotifications,
      pushNotifications: userProfile.pushNotifications,
      marketingEmails: false, // Default since not in schema
      newsletter: false, // Map to marketing emails
      notifications: userProfile.pushNotifications, // Map to push notifications
      defaultDashboard: (userProfile as UserProfileExtended).defaultDashboard || 'main',
      sidebarCollapsed: (userProfile as UserProfileExtended).sidebarCollapsed ?? false,
      compactMode: false, // Default since not in schema
      betaFeatures: (userProfile as UserProfileExtended).betaFeatures ?? false,
      analyticsSharing: (userProfile as UserProfileExtended).analyticsSharing ?? true,
      crashReporting: true, // Default since not in schema
      autoSave: true, // Default since not in schema
      keyboardShortcuts: true, // Default since not in schema
      soundEffects: false, // Default since not in schema
    });

  } catch (error) {
    logger.error('Error fetching user preferences:', error);
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
    return new Response('Too many requests', { status: 429 });
  }

  try {
    const { userId } = await auth();

    if (!userId) {
      return Errors.unauthorized();
    }

    const body = await request.json();
    const validation = safeValidateSchema(UpdateUserPreferencesSchema, body);
    if (!validation.success) {
      return Errors.badRequest('Invalid preferences data');
    }
    
    const preferences = validation.data;

    // Update user preferences in Supabase
    const updatedProfile = await prisma.userProfile.upsert({
      where: { clerkId: userId },
      update: {
        theme: preferences.theme,
        language: preferences.language,
        timezone: preferences.timezone,
        emailNotifications: preferences.emailNotifications,
        pushNotifications: preferences.pushNotifications,
        // Note: Extended preference fields will be handled separately if schema is updated
        updatedAt: new Date(),
      },
      create: {
        clerkId: userId,
        theme: preferences.theme,
        language: preferences.language,
        timezone: preferences.timezone,
        emailNotifications: preferences.emailNotifications,
        pushNotifications: preferences.pushNotifications,
        // Note: Extended preference fields will be handled separately if schema is updated
      },
    });

    return NextResponse.json({
      message: 'Preferences updated successfully',
      preferences: {
        theme: updatedProfile.theme,
        language: updatedProfile.language,
        timezone: updatedProfile.timezone,
        emailNotifications: updatedProfile.emailNotifications,
        pushNotifications: updatedProfile.pushNotifications,
        marketingEmails: false,
        newsletter: false, // Map to marketing emails
        notifications: updatedProfile.pushNotifications, // Map to push notifications
        defaultDashboard: (updatedProfile as UserProfileExtended).defaultDashboard || 'main',
        sidebarCollapsed: (updatedProfile as UserProfileExtended).sidebarCollapsed ?? false,
        compactMode: false,
        betaFeatures: (updatedProfile as UserProfileExtended).betaFeatures ?? false,
        analyticsSharing: (updatedProfile as UserProfileExtended).analyticsSharing ?? true,
        crashReporting: true,
        autoSave: true,
        keyboardShortcuts: true,
        soundEffects: false,
      }
    });

  } catch (error) {
    logger.error('Error updating user preferences:', error);
    return Errors.internal();
  }
}
