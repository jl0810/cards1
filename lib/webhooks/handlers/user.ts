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

async function handleUserCreated(evt: WebhookEvent) {
  // Type assertion for user data
  const userData = evt.data as any; // Clerk user event data
  const { id, email_addresses, first_name, last_name, created_at } = userData;

  console.log(`User created: ${id} (${email_addresses?.[0]?.email_address})`);

  // TODO: Add user to your database
  // Example:
  // await db.users.create({
  //   id,
  //   email: email_addresses?.[0]?.email_address,
  //   firstName: first_name,
  //   lastName: last_name,
  //   createdAt: new Date(created_at),
  //   clerkId: id
  // });

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
  const { id, email_addresses, first_name, last_name, updated_at } = userData;

  console.log(`User updated: ${id}`);

  // TODO: Update user in your database
  // Example:
  // await db.users.update({
  //   where: { clerkId: id },
  //   data: {
  //     email: email_addresses?.[0]?.email_address,
  //     firstName: first_name,
  //     lastName: last_name,
  //     updatedAt: new Date(updated_at)
  //   }
  // });

  trackEvent('user_updated', {
    user_id: id,
    email: email_addresses?.[0]?.email_address
  });
}

async function handleUserDeleted(evt: WebhookEvent) {
  const { id } = evt.data;

  console.log(`User deleted: ${id}`);

  // TODO: Handle user deletion in your database
  // This might involve soft deletes or data cleanup
  // Example:
  // await db.users.update({
  //   where: { clerkId: id },
  //   data: { deletedAt: new Date(), isActive: false }
  // });

  trackEvent('user_deleted', {
    user_id: id
  });
}
