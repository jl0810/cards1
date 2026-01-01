/**
 * Account Nickname API
 * Allows users to set custom nicknames for bank accounts
 *
 * @module app/api/account/[accountId]/nickname
 */

import { NextResponse as _NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { plaidAccounts, accountExtended } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { Errors, successResponse } from "@/lib/api-errors";
import { logger } from "@/lib/logger";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import {
  UpdateAccountNicknameSchema,
  safeValidateSchema,
} from "@/lib/validations";

/**
 * Update account nickname
 *
 * @route PATCH /api/account/[accountId]/nickname
 * @implements BR-016 - Account Nickname Persistence
 * @satisfies US-009 - Nickname Accounts
 * @tested __tests__/lib/validations.test.ts (schema validation)
 *
 * @param {Request} req - Contains nickname (string, max 50 chars, or null to clear)
 * @param {Object} params - Route parameters
 * @param {string} params.accountId - Plaid account ID
 * @returns {Promise<NextResponse>} Success response
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ accountId: string }> },
) {
  // Rate limit: 20 writes per minute
  const limited = await rateLimit(req, RATE_LIMITS.write);
  if (limited) {
    return new Response("Too many requests", { status: 429 });
  }

  const session = await auth();
  if (!session?.user?.id) return Errors.unauthorized();
  const userId = session.user.id;

  const { accountId } = await params;
  const body = await req.json();

  // Validate request body
  const validation = safeValidateSchema(UpdateAccountNicknameSchema, body);
  if (!validation.success) {
    return Errors.badRequest(
      validation.error.issues[0]?.message || "Invalid input",
    );
  }

  const { nickname } = validation.data;

  try {
    // Find the PlaidAccount first to ensure it belongs to this user
    // We need to join with plaidItems to check userId
    const account = await db.query.plaidAccounts.findFirst({
      where: (table: any, { eq }: any) => eq(table.accountId, accountId),
      with: {
        plaidItem: {
          columns: {
            userId: true
          }
        }
      }
    });

    if (!account) return Errors.notFound("Account");

    // Check if the user owns this account
    // Note: account.plaidItem.userId is a UUID in the database, but session.user.id might be a string.
    // We should ensure they match.
    if (account.plaidItem.userId !== userId) return Errors.forbidden();

    // Upsert the extended record with the new nickname
    // Drizzle doesn't have a native upsert that works exactly like Prisma's for all cases, 
    // but we can use onConflictDoUpdate
    await db.insert(accountExtended)
      .values({
        plaidAccountId: account.id,
        nickname,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: accountExtended.plaidAccountId,
        set: {
          nickname,
          updatedAt: new Date(),
        },
      });

    return successResponse({ success: true });
  } catch (e) {
    logger.error("Error updating account nickname", e, { accountId });
    return Errors.internal(e instanceof Error ? e.message : "Unknown error");
  }
}
