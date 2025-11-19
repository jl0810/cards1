import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { Webhook } from 'svix';
import { clerkClient } from '@clerk/nextjs/server';

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
    console.log(`New user created: ${userId}`);
    
    // You can initialize user metadata here
    try {
      const client = await clerkClient();
      await client.users.updateUserMetadata(userId, {
        publicMetadata: {
          subscriptionStatus: 'trialing',
          trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 days from now
          subscriptionPlan: 'free_trial',
        }
      });
    } catch (error) {
      console.error('Error updating user metadata:', error);
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
