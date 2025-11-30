/**
 * Clerk Webhook Handler
 * Processes Clerk authentication webhooks (user created, updated, deleted)
 * 
 * @module app/api/webhooks/clerk
 */

import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { Webhook } from 'svix';
import { clerkClient } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { ClerkWebhookEventSchema, ClerkWebhookHeadersSchema, safeValidateSchema } from '@/lib/validations';
import { z } from 'zod';

/**
 * Type for Clerk webhook event
 */
type ClerkWebhookEvent = z.infer<typeof ClerkWebhookEventSchema>;

/**
 * Type for webhook headers
 */
type WebhookHeaders = z.infer<typeof ClerkWebhookHeadersSchema>;

/**
 * Process Clerk webhook events
 * 
 * @route POST /api/webhooks/clerk
 * @implements BR-001 - User Profile Creation (via webhook handler)
 * @implements BR-002 - Welcome Email (via webhook handler)
 * @satisfies US-001 - User Registration
 * @satisfies US-002 - User Profile Management
 * @tested __tests__/api/webhooks/clerk.test.ts
 * 
 * @param {NextRequest} req - Clerk webhook payload
 * @returns {Promise<NextResponse>} Status 200 on success
 */
export async function POST(req: NextRequest) {
  // Get the headers (await in Next.js 15)
  const headerPayload = await headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  // Validate headers using Zod
  const headerValidation = safeValidateSchema(ClerkWebhookHeadersSchema, {
    'svix-id': svix_id || '',
    'svix-timestamp': svix_timestamp || '',
    'svix-signature': svix_signature || '',
  });

  if (!headerValidation.success) {
    logger.error('Invalid webhook headers', headerValidation.error);
    return new Response('Error occurred -- invalid svix headers', {
      status: 400
    });
  }

  // Get the body
  const payload = await req.json();
  const body = JSON.stringify(payload);

  // Create a new Svix instance with your secret.
  const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET!);

  let evt: ClerkWebhookEvent;

  // Verify the payload with the headers
  try {
    const verifiedEvent = wh.verify(body, {
      "svix-id": svix_id || '',
      "svix-timestamp": svix_timestamp || '',
      "svix-signature": svix_signature || '',
    });

    // Validate the event structure using Zod
    const eventValidation = safeValidateSchema(ClerkWebhookEventSchema, verifiedEvent);
    if (!eventValidation.success) {
      logger.error('Invalid webhook event structure', eventValidation.error);
      return new Response('Error occurred -- invalid event structure', {
        status: 400
      });
    }

    evt = eventValidation.data;
  } catch (err) {
    logger.error('Error verifying webhook', err);
    return new Response('Error occurred', {
      status: 400
    });
  }

  // Handle the event
  const eventType = evt.type;

  if (eventType === 'user.created') {
    // Handle new user creation
    const userId = evt.data.id;
    const email = evt.data.email_addresses?.[0]?.email_address;
    const firstName = evt.data.first_name;
    const lastName = evt.data.last_name;
    const avatar = evt.data.image_url;

    logger.info('New user created', { userId });

    try {
      // Create UserProfile in DB
      await prisma.userProfile.create({
        data: {
          clerkId: userId,
          name: firstName || '',
          avatar: avatar,
        }
      });

      const client = await clerkClient();
      await client.users.updateUserMetadata(userId, {
        publicMetadata: {
          subscriptionStatus: 'trialing',
          trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 days from now
          subscriptionPlan: 'free_trial',
        }
      });
    } catch (error) {
      logger.error('Error creating user profile', error, { userId });
    }
  }

  if (eventType === 'user.updated') {
    const userId = evt.data.id;
    const email = evt.data.email_addresses?.[0]?.email_address;
    const firstName = evt.data.first_name;
    const lastName = evt.data.last_name;
    const avatar = evt.data.image_url;

    try {
      await prisma.userProfile.update({
        where: { clerkId: userId },
        data: {
          name: firstName || '',
          avatar: avatar,
        }
      });
    } catch (error) {
      logger.error('Error updating user profile', error, { userId });
    }
  }

  if (eventType === 'user.updated') {
    // Handle user updates (including subscription changes)
    const userId = evt.data.id;
    const publicMetadata = evt.data.public_metadata;

    logger.info('User updated', { userId, publicMetadata });
  }

  return new Response('', { status: 200 });
}
