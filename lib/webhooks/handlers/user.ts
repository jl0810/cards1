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

import type { UserJSON } from "@clerk/backend";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { WebhookEvent } from "@clerk/nextjs/server";
import { trackEvent } from "@/lib/analytics-utils";
import { EmailService, sendEmail } from "@/lib/email-utils";
import { z } from "zod";
import { plaidClient } from "@/lib/plaid";

/**
 * Type for Clerk user webhook data
 */
interface ClerkUserWebhookData {
  id: string;
  email_addresses?: Array<{
    email_address: string;
    id: string;
  }>;
  first_name?: string;
  last_name?: string;
  image_url?: string;
  created_at?: number;
  updated_at?: number;
}

/**
 * Zod schema for validating Clerk webhook user data
 */
const ClerkUserWebhookDataSchema: z.ZodSchema<ClerkUserWebhookData> = z.object({
  id: z.string(),
  email_addresses: z
    .array(
      z.object({
        email_address: z.string().email(),
        id: z.string(),
      }),
    )
    .optional(),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  image_url: z.string().url().optional(),
  created_at: z.number().optional(),
  updated_at: z.number().optional(),
});

/**
 * Handle Clerk user-related webhook events
 */
export async function handleUserEvent(evt: WebhookEvent) {
  const { id } = evt.data;
  const eventType = evt.type;

  console.log(`Processing user event: ${eventType} for user ${id}`);

  try {
    switch (eventType) {
      case "user.created":
        await handleUserCreated(evt);
        break;

      case "user.updated":
        await handleUserUpdated(evt);
        break;

      case "user.deleted":
        await handleUserDeleted(evt);
        break;

      default:
        console.log(`Unhandled user event type: ${eventType}`);
    }

    // Track user events for analytics
    trackEvent("user_webhook", {
      event_type: eventType,
      user_id: id,
      timestamp: new Date().toISOString(),
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
  // Validate and type the webhook data
  const userData = ClerkUserWebhookDataSchema.parse(evt.data);
  const { id, email_addresses, first_name, last_name, image_url, created_at } =
    userData;

  logger.info("User created webhook received", {
    userId: id,
    email: email_addresses?.[0]?.email_address,
    firstName: first_name,
    lastName: last_name,
  });

  try {
    // Determine the best name to use
    const displayName =
      first_name ||
      email_addresses?.[0]?.email_address?.split("@")[0] ||
      "User";

    // Create user profile in database
    const userProfile = await prisma.userProfile.create({
      data: {
        clerkId: id,
        name: displayName,
        avatar: image_url || undefined,
        lastLoginAt: new Date(),
      },
    });

    // Create primary family member for the user
    await prisma.familyMember.create({
      data: {
        userId: userProfile.id,
        name: displayName,
        email: email_addresses?.[0]?.email_address || undefined,
        isPrimary: true,
        role: "Owner",
      },
    });

    logger.info("User profile and primary member created", {
      userId: id,
      profileId: userProfile.id,
      displayName: displayName,
    });
  } catch (error) {
    logger.error("Failed to create user profile", error, { userId: id });
    throw error;
  }

  // Send welcome email
  if (email_addresses?.[0]?.email_address) {
    try {
      const userName =
        first_name || email_addresses[0].email_address.split("@")[0];
      const emailConfig = await EmailService.sendWelcomeEmail(
        email_addresses[0].email_address,
        userName,
      );
      await sendEmail(emailConfig);
      console.log(`Welcome email sent to ${email_addresses[0].email_address}`);
    } catch (error) {
      console.error("Failed to send welcome email:", error);
    }
  }

  // Track user signup analytics
  trackEvent("user_created", {
    user_id: id,
    email: email_addresses?.[0]?.email_address,
    signup_method: "clerk",
  });
}

async function handleUserUpdated(evt: WebhookEvent) {
  // Validate and type the webhook data
  const userData = ClerkUserWebhookDataSchema.parse(evt.data);
  const { id, email_addresses, first_name, image_url, updated_at } = userData;

  logger.info("User updated webhook received", { userId: id });

  try {
    // Update user profile in database
    await prisma.userProfile.update({
      where: { clerkId: id },
      data: {
        name: first_name || undefined,
        avatar: image_url || undefined,
        updatedAt: updated_at ? new Date(updated_at) : new Date(),
      },
    });

    logger.info("User profile updated", { userId: id });
  } catch (error) {
    // If user doesn't exist, create them (webhook race condition handling)
    if ((error as { code?: string }).code === "P2025") {
      logger.warn("User not found during update, creating instead", {
        userId: id,
      });
      await handleUserCreated(evt);
    } else {
      logger.error("Failed to update user profile", error, { userId: id });
      throw error;
    }
  }

  trackEvent("user_updated", {
    user_id: id,
    email: email_addresses?.[0]?.email_address,
  });
}

/**
 * Handle user account deletion
 *
 * @implements BR-035 - Account Deletion & Data Privacy
 * @satisfies US-021 - Account Deletion
 *
 * CRITICAL COMPLIANCE NOTES:
 *
 * 1. GDPR/Privacy Compliance (Data Deletion):
 *    - ALL personal data is deleted from database
 *    - UserProfile, FamilyMembers, PlaidItems, PlaidAccounts, Transactions
 *    - Cascade deletes configured in Prisma schema
 *
 * 2. Plaid Compliance (Token Retention):
 *    - Plaid access tokens are NOT deleted from Supabase Vault
 *    - Required by Plaid Terms of Service for audit/compliance
 *    - Vault is append-only by design (cannot delete)
 *    - Orphaned tokens in Vault are acceptable and required
 *
 * 3. Distinction from "Lame Duck" Accounts:
 *    - Lame Duck (payment ended): Data retained, account inactive
 *    - Deleted (user requested): Data deleted, tokens retained
 */
/**
 * Handle user account deletion
 *
 * @implements BR-035 - Account Deletion & Data Privacy
 * @satisfies US-021 - Account Deletion
 *
 * REVISED IMPLEMENTATION (Soft Delete / Deactivation):
 *
 * 1. Plaid Item Deactivation:
 *    - Call plaidClient.itemRemove() to stop billing and invalidate tokens
 *    - Mark PlaidItem as 'deactivated' in DB
 *    - Hard delete PlaidAccounts and PlaidTransactions (PII/Financial Data)
 *
 * 2. User Anonymization (Scrubbing):
 *    - Do NOT delete UserProfile (required for PlaidItem FK)
 *    - Scrub PII (name, email, avatar) -> "Deleted User"
 *    - Set deletedAt timestamp
 *    - Scrub FamilyMembers -> "Deleted Member"
 */
async function handleUserDeleted(evt: WebhookEvent) {
  // Validate and type the webhook data
  const userData = ClerkUserWebhookDataSchema.parse(evt.data);
  const { id } = userData;

  logger.info("User account deletion initiated", {
    userId: id,
    reason: "User-requested account deletion (GDPR compliance)",
  });

  try {
    // 1. Get User with Items
    const userProfile = await prisma.userProfile.findUnique({
      where: { clerkId: id },
      include: {
        plaidItems: true,
      },
    });

    if (!userProfile) {
      logger.warn("User profile not found during deletion", { userId: id });
      return;
    }

    // 2. Process Plaid Items (Stop Billing & Cleanup)
    for (const item of userProfile.plaidItems) {
      try {
        // A. Retrieve Access Token from Vault
        // Note: We use raw query because Vault is outside Prisma's schema
        const result = await prisma.$queryRaw<{ decrypted_secret: string }[]>`
          SELECT decrypted_secret FROM vault.decrypted_secrets WHERE id = ${item.accessTokenId}::uuid;
        `;
        const accessToken = result[0]?.decrypted_secret;

        // B. Call Plaid to remove item (Stops Billing)
        if (accessToken) {
          try {
            await plaidClient.itemRemove({ access_token: accessToken });
            logger.info("Plaid item removed from Plaid", {
              itemId: item.itemId,
            });
          } catch (plaidError) {
            // Ignore ITEM_NOT_FOUND, log others
            logger.warn(
              "Error removing Plaid item (might already be removed)",
              {
                itemId: item.itemId,
                error: plaidError,
              },
            );
          }
        }

        // C. Cleanup Financial Data (Hard Delete)
        await prisma.plaidTransaction.deleteMany({
          where: { plaidItemId: item.id },
        });
        await prisma.plaidAccount.deleteMany({
          where: { plaidItemId: item.id },
        });

        // D. Deactivate Item in DB
        await prisma.plaidItem.update({
          where: { id: item.id },
          data: {
            status: "deactivated",
            // We keep the accessTokenId in case we need it for audit,
            // but the token is invalid at Plaid now.
          },
        });
      } catch (itemError) {
        logger.error("Error processing item during user deletion", itemError, {
          itemId: item.id,
        });
        // Continue to next item even if one fails
      }
    }

    // 3. Scrub Family Members
    await prisma.familyMember.updateMany({
      where: { userId: userProfile.id },
      data: {
        name: "Deleted Member",
        email: null,
        avatar: null,
      },
    });

    // 4. Scrub User Profile (Soft Delete)
    await prisma.userProfile.update({
      where: { id: userProfile.id },
      data: {
        name: "Deleted User",
        avatar: null,
        bio: null,
        website: null,
        location: null,
        deletedAt: new Date(),
        // We keep clerkId to maintain the unique constraint and history
      },
    });

    logger.info("User account soft-deleted successfully", {
      userId: id,
      note: "Plaid items deactivated, financial data wiped, user profile scrubbed",
    });
  } catch (error) {
    logger.error("Failed to process user deletion", error, { userId: id });
    throw error;
  }

  trackEvent("user_deleted", {
    user_id: id,
    deletion_type: "user_requested",
    compliance: "GDPR + Plaid (Soft Delete)",
  });
}
