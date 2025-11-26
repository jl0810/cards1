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

/**
 * Process Clerk webhook events
 * 
 * @route POST /api/webhooks/clerk
 * @implements BR-001 - User Profile Creation (via webhook handler)
 * @implements BR-002 - Welcome Email (via webhook handler)
 * @satisfies US-001 - User Registration
 * @satisfies US-002 - User Profile Management
 * @tested None (webhook endpoints need tests)
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

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Error occurred -- no svix headers', {
      status: 400
    });
  }

  // Get the body
  const payload = await req.json();
  const body = JSON.stringify(payload);

  // Create a new Svix instance with your secret.
  const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET!);

  let evt: any;

  // Verify the payload with the headers
  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as any;
  } catch (err) {
    console.error('Error verifying webhook:', err);
    return new Response('Error occurred', {
      status: 400
    });
  }

  // Handle the event
  const eventType = evt.type;

  if (eventType === 'user.created') {
    // Handle new user creation
    const userId = evt.data.id;
    const email = evt.data.email_addresses[0]?.email_address;
    const firstName = evt.data.first_name;
    const lastName = evt.data.last_name;
    const avatar = evt.data.image_url;

    console.log(`New user created: ${userId}`);

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
      console.error('Error creating user profile:', error);
    }
  }

  if (eventType === 'user.updated') {
    const userId = evt.data.id;
    const email = evt.data.email_addresses[0]?.email_address;
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
      console.error('Error updating user profile:', error);
    }
  }

  if (eventType === 'user.updated') {
    // Handle user updates (including subscription changes)
    const userId = evt.data.id;
    const publicMetadata = evt.data.public_metadata;

    console.log(`User updated: ${userId}`, publicMetadata);
  }

  return new Response('', { status: 200 });
}
