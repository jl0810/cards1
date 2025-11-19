import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      console.error('No userId found in auth');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Fetching preferences for userId:', userId);

    // Get user preferences from Supabase
    const userProfile = await prisma.userProfile.findUnique({
      where: { clerkId: userId },
    });

    console.log('User profile found:', !!userProfile);

    if (!userProfile) {
      // Create default preferences for new user
      console.log('Creating default profile for user:', userId);
      const defaultProfile = await prisma.userProfile.create({
        data: {
          clerkId: userId,
          email: '', // Will be updated by webhook
        },
      });

      console.log('Default profile created:', defaultProfile.id);
      return NextResponse.json({
        theme: defaultProfile.theme || 'system',
        language: defaultProfile.language || 'en',
        timezone: defaultProfile.timezone || 'UTC',
        emailNotifications: defaultProfile.emailNotifications ?? true,
        pushNotifications: defaultProfile.pushNotifications ?? false,
        marketingEmails: false, // Default since not in schema
        newsletter: false, // Map to marketing emails
        notifications: defaultProfile.pushNotifications ?? false, // Map to push notifications
        defaultDashboard: (defaultProfile as any).defaultDashboard || 'main',
        sidebarCollapsed: (defaultProfile as any).sidebarCollapsed ?? false,
        compactMode: false, // Default since not in schema
        betaFeatures: (defaultProfile as any).betaFeatures ?? false,
        analyticsSharing: (defaultProfile as any).analyticsSharing ?? true,
        crashReporting: true, // Default since not in schema
        autoSave: true, // Default since not in schema
        keyboardShortcuts: true, // Default since not in schema
        soundEffects: false, // Default since not in schema
      });
    }

    console.log('Returning existing user preferences');
    return NextResponse.json({
      theme: userProfile.theme,
      language: userProfile.language,
      timezone: userProfile.timezone,
      emailNotifications: userProfile.emailNotifications,
      pushNotifications: userProfile.pushNotifications,
      marketingEmails: false, // Default since not in schema
      newsletter: false, // Map to marketing emails
      notifications: userProfile.pushNotifications, // Map to push notifications
      defaultDashboard: (userProfile as any).defaultDashboard || 'main',
      sidebarCollapsed: (userProfile as any).sidebarCollapsed ?? false,
      compactMode: false, // Default since not in schema
      betaFeatures: (userProfile as any).betaFeatures ?? false,
      analyticsSharing: (userProfile as any).analyticsSharing ?? true,
      crashReporting: true, // Default since not in schema
      autoSave: true, // Default since not in schema
      keyboardShortcuts: true, // Default since not in schema
      soundEffects: false, // Default since not in schema
    });

  } catch (error) {
    console.error('Error fetching user preferences:', error);
    return NextResponse.json({
      error: 'Failed to fetch preferences',
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const preferences = await request.json();

    // Update user preferences in Supabase
    const updatedProfile = await prisma.userProfile.upsert({
      where: { clerkId: userId },
      update: {
        theme: preferences.theme,
        language: preferences.language,
        timezone: preferences.timezone,
        emailNotifications: preferences.emailNotifications,
        pushNotifications: preferences.notifications || preferences.pushNotifications, // Handle both field names
        // Note: Extended preference fields will be handled separately if schema is updated
        updatedAt: new Date(),
      },
      create: {
        clerkId: userId,
        email: '', // Will be updated by webhook
        theme: preferences.theme,
        language: preferences.language,
        timezone: preferences.timezone,
        emailNotifications: preferences.emailNotifications,
        pushNotifications: preferences.notifications || preferences.pushNotifications, // Handle both field names
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
        defaultDashboard: (updatedProfile as any).defaultDashboard || 'main',
        sidebarCollapsed: (updatedProfile as any).sidebarCollapsed ?? false,
        compactMode: false,
        betaFeatures: (updatedProfile as any).betaFeatures ?? false,
        analyticsSharing: (updatedProfile as any).analyticsSharing ?? true,
        crashReporting: true,
        autoSave: true,
        keyboardShortcuts: true,
        soundEffects: false,
      }
    });

  } catch (error) {
    console.error('Error updating user preferences:', error);
    return NextResponse.json({ 
      error: 'Failed to update preferences',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
