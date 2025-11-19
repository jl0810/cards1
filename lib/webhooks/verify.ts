import { Webhook } from 'svix';
import { WebhookEvent } from '@clerk/nextjs/server';

interface WebhookHeaders {
  'svix-id': string;
  'svix-timestamp': string;
  'svix-signature': string;
}

/**
 * Verify Clerk webhook signature
 */
export function verifyWebhook(
  body: string,
  headers: WebhookHeaders,
  secret: string
): WebhookEvent {
  const wh = new Webhook(secret);

  return wh.verify(body, {
    "svix-id": headers['svix-id'],
    "svix-timestamp": headers['svix-timestamp'],
    "svix-signature": headers['svix-signature'],
  }) as WebhookEvent;
}

/**
 * Extract webhook headers from request
 */
export async function getWebhookHeaders(request: Request): Promise<WebhookHeaders | null> {
  const headers = await request.headers;

  const svixId = headers.get("svix-id");
  const svixTimestamp = headers.get("svix-timestamp");
  const svixSignature = headers.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return null;
  }

  return {
    'svix-id': svixId,
    'svix-timestamp': svixTimestamp,
    'svix-signature': svixSignature,
  };
}
