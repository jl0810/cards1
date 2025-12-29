/**
 * Account Nickname API
 * Allows users to set custom nicknames for bank accounts
 *
 * @module app/api/account/[accountId]/nickname
 */

import { NextResponse as _NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
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

  const { userId } = await auth();
  if (!userId) return Errors.unauthorized();

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
    const account = await prisma.plaidAccount.findUnique({
      where: { accountId: accountId },
      include: { extended: true, plaidItem: { select: { userId: true } } },
    });
    if (!account) return Errors.notFound("Account");
    if (account.plaidItem.userId !== userId) return Errors.forbidden();

    // Upsert the extended record with the new nickname
    await prisma.accountExtended.upsert({
      where: { plaidAccountId: account.id },
      update: { nickname },
      create: {
        plaidAccountId: account.id,
        nickname,
      },
    });

    return successResponse({ success: true });
  } catch (e) {
    logger.error("Error updating account nickname", e, { accountId });
    return Errors.internal(e instanceof Error ? e.message : "Unknown error");
  }
}
