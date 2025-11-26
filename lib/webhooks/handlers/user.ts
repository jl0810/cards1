/**
 * Clerk user webhook handlers
 * 
 * @module lib/webhooks/handlers/user
 * @implements BR-001 - User Profile Creation
 * @implements BR-002 - Welcome Email
 * @satisfies US-001 - User Registration
 * @satisfies US-002 - User Profile Management
 * @tested None (webhook handlers need tests)
 */

import type { UserJSON } from '@clerk/backend';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { WebhookEvent } from '@clerk/nextjs/server';
import { trackEvent } from '@/utils/analytics';
import { EmailService, sendEmail } from '@/utils/email';

/**
 * Handle Clerk user-related webhook events
 */
export async function handleUserEvent(evt: WebhookEvent) {
  const { id } = evt.data;
  const eventType = evt.type;

  console.log(`Processing user event: ${eventType} for user ${id}`);

  try {
    switch (eventType) {
      case 'user.created':
        await handleUserCreated(evt);
        break;

      case 'user.updated':
        await handleUserUpdated(evt);
        break;

      case 'user.deleted':
        await handleUserDeleted(evt);
        break;

      default:
        console.log(`Unhandled user event type: ${eventType}`);
    }

    // Track user events for analytics
    trackEvent('user_webhook', {
      event_type: eventType,
      user_id: id,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error(`Error handling user event ${eventType}:`, error);
    // In production, you might want to send this to an error tracking service
  }
}

/**
 * Creates user profile and primary family member on user registration
 * 
 * @implements BR-001 - User Profile Creation
 * @implements BR-002 - Welcome Email
 * @satisfies US-001 - User Registration
 */
async function handleUserCreated(evt: WebhookEvent) {
  // Type assertion for user data
  const userData = evt.data as any; // Clerk user event data
  const { id, email_addresses, first_name, last_name, image_url, created_at } = userData;

  logger.info('User created webhook received', { 
    userId: id, 
    email: email_addresses?.[0]?.email_address 
  });

  try {
    // Create user profile in database
    const userProfile = await prisma.userProfile.create({
      data: {
        clerkId: id,
        name: first_name || undefined,
        avatar: image_url || undefined,
        lastLoginAt: new Date(),
      },
    });

    // Create primary family member for the user
    await prisma.familyMember.create({
      data: {
        userId: userProfile.id,
        name: first_name || 'Primary',
        email: email_addresses?.[0]?.email_address || undefined,
        isPrimary: true,
        role: 'Owner',
      },
    });

    logger.info('User profile and primary member created', { 
      userId: id, 
      profileId: userProfile.id 
    });
  } catch (error) {
    logger.error('Failed to create user profile', error, { userId: id });
    throw error;
  }

  // Send welcome email
  if (email_addresses?.[0]?.email_address) {
    try {
      const userName = first_name || email_addresses[0].email_address.split('@')[0];
      const emailConfig = await EmailService.sendWelcomeEmail(
        email_addresses[0].email_address,
        userName
      );
      await sendEmail(emailConfig);
      console.log(`Welcome email sent to ${email_addresses[0].email_address}`);
    } catch (error) {
      console.error('Failed to send welcome email:', error);
    }
  }

  // Track user signup analytics
  trackEvent('user_created', {
    user_id: id,
    email: email_addresses?.[0]?.email_address,
    signup_method: 'clerk'
  });
}

async function handleUserUpdated(evt: WebhookEvent) {
  // Type assertion for user data
  const userData = evt.data as any; // Clerk user event data
  const { id, email_addresses, first_name, last_name, image_url, updated_at } = userData;

  logger.info('User updated webhook received', { userId: id });

  try {
    // Update user profile in database
    await prisma.userProfile.update({
      where: { clerkId: id },
      data: {
        name: first_name || undefined,
        avatar: image_url || undefined,
        updatedAt: new Date(updated_at),
      },
    });

    logger.info('User profile updated', { userId: id });
  } catch (error) {
    // If user doesn't exist, create them (webhook race condition handling)
    if ((error as { code?: string }).code === 'P2025') {
      logger.warn('User not found during update, creating instead', { userId: id });
      await handleUserCreated(evt);
    } else {
      logger.error('Failed to update user profile', error, { userId: id });
      throw error;
    }
  }

  trackEvent('user_updated', {
    user_id: id,
    email: email_addresses?.[0]?.email_address
  });
}

async function handleUserDeleted(evt: WebhookEvent) {
  const { id } = evt.data;

  logger.info('User deleted webhook received', { userId: id });

  try {
    // Delete user profile (cascades to family members, plaid items, etc. via Prisma schema)
    await prisma.userProfile.delete({
      where: { clerkId: id },
    });

    logger.info('User profile deleted', { userId: id });
  } catch (error) {
    // User might already be deleted
    if ((error as { code?: string }).code === 'P2025') {
      logger.warn('User not found during deletion', { userId: id });
    } else {
      logger.error('Failed to delete user profile', error, { userId: id });
      throw error;
    }
  }

  trackEvent('user_deleted', {
    user_id: id
  });
}
