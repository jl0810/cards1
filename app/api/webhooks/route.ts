import { headers } from 'next/headers';
import { Webhook } from 'svix';
import { WebhookEvent } from '@clerk/nextjs/server';
import { handleUserEvent } from '@/lib/webhooks/handlers/user';
import { handleSubscriptionEvent } from '@/lib/webhooks/handlers/subscription';

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    console.error('CLERK_WEBHOOK_SECRET not configured');
    return Response.json({ error: 'Webhook secret not configured' }, { status: 500 });
  }

  // Get webhook headers
  const headerPayload = await headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  // Validate required headers
  if (!svix_id || !svix_timestamp || !svix_signature) {
    console.error('Missing required webhook headers');
    return Response.json({ error: 'Missing webhook headers' }, { status: 400 });
  }

  const body = await req.text();

  try {
    // Verify the webhook signature
    const wh = new Webhook(WEBHOOK_SECRET);
    const evt: WebhookEvent = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;

    console.log(`Received webhook: ${evt.type}`);

    // Route to appropriate handler based on event type
    if (evt.type.startsWith('user.')) {
      await handleUserEvent(evt);
    } else if (evt.type.startsWith('subscription.')) {
      await handleSubscriptionEvent(evt);
    } else {
      console.log(`Unhandled event type: ${evt.type}`);
      // Still return success for unhandled events to avoid retries
    }

    return Response.json({ received: true, event: evt.type });

  } catch (error) {
    console.error('Webhook verification failed:', error);
    return Response.json({ error: 'Webhook verification failed' }, { status: 400 });
  }
}

// Handle GET requests (for testing webhook endpoint availability)
export async function GET() {
  return Response.json({
    message: 'Clerk webhook endpoint is active',
    timestamp: new Date().toISOString()
  });
}
