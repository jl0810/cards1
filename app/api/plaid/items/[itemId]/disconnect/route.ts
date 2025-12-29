/**
 * Plaid Item Disconnect API
 * Removes Item from Plaid and marks as disconnected in database
 *
 * @module app/api/plaid/items/[itemId]/disconnect
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, schema, eq, and, sql } from "@/db";
import { logger } from "@/lib/logger";
import { Errors } from "@/lib/api-errors";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { plaidClient } from "@/lib/plaid";

export const dynamic = "force-dynamic";

/**
 * Disconnect a Plaid item
 *
 * CRITICAL: Calls Plaid's /item/remove to:
 * - Invalidate the access_token
 * - Stop subscription billing for Transactions/Liabilities/Investments
 * - Follow Plaid's best practice for user offboarding
 *
 * @route POST /api/plaid/items/[itemId]/disconnect
 * @implements BR-034 - Proper Item Disconnection
 * @implements BR-039 - Smart Fix Adoption (Soft Delete Support)
 * @satisfies US-006 - Link Bank Account (disconnect capability)
 * @satisfies US-020 - Monitor Bank Connection Health
 * @tested __tests__/api/plaid/items/disconnect.test.ts
 *
 * @see https://plaid.com/docs/api/items/#itemremove
 *
 * @param {Request} req - HTTP request
 * @param {Object} params - Route parameters
 * @param {string} params.itemId - ID of Plaid item to disconnect
 * @returns {Promise<NextResponse>} Success response
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ itemId: string }> },
) {
  // Rate limit: 5 disconnects per minute (sensitive/destructive operation)
  const limited = await rateLimit(req, RATE_LIMITS.sensitive);
  if (limited) {
    return new Response("Too many requests", { status: 429 });
  }

  const { itemId } = await params;

  try {
    const session = await auth();
    const user = session?.user;
    if (!user?.id) return Errors.unauthorized();
    if (!itemId || itemId.trim() === "")
      return Errors.badRequest("Item ID is required");

    const userProfile = await db.query.userProfiles.findFirst({
      where: eq(schema.userProfiles.supabaseId, user.id),
    });
    if (!userProfile) return Errors.notFound("User profile");

    // Verify ownership (IDOR protection)
    const plaidItem = await db.query.plaidItems.findFirst({
      where: and(
        eq(schema.plaidItems.id, itemId),
        eq(schema.plaidItems.userId, userProfile.id),
      ),
    });

    if (!plaidItem) return Errors.notFound("Plaid item");

    // Get access token from Vault
    const secretId = plaidItem.accessTokenId;
    const vaultResult = await db.execute(sql`
        SELECT decrypted_secret FROM vault.decrypted_secrets WHERE id = ${secretId}::uuid;
    `);

    const accessToken = (vaultResult as any)[0]?.decrypted_secret;
    if (!accessToken) {
      logger.error("Access token not found in Vault", {
        itemId,
        accessTokenId: plaidItem.accessTokenId,
      });
      return Errors.internal("Access token not found");
    }

    // CRITICAL: Call Plaid's /item/remove to:
    // 1. Invalidate the access_token
    // 2. Stop subscription billing
    // 3. Follow Plaid's best practice
    try {
      await plaidClient.itemRemove({
        access_token: accessToken,
      });
      logger.info("Successfully removed Item from Plaid", {
        itemId,
        plaidItemId: plaidItem.itemId,
        institutionName: plaidItem.institutionName,
      });
    } catch (plaidError) {
      // Log but don't fail - we still want to mark as disconnected in our DB
      logger.error("Failed to remove Item from Plaid", plaidError, {
        itemId,
        plaidItemId: plaidItem.itemId,
      });
    }

    // Mark as disconnected in database
    await db.transaction(async (tx) => {
      await tx.update(schema.plaidItems)
        .set({ status: "disconnected", updatedAt: new Date() })
        .where(eq(schema.plaidItems.id, itemId));

      await tx.update(schema.plaidAccounts)
        .set({ status: "inactive", updatedAt: new Date() })
        .where(eq(schema.plaidAccounts.plaidItemId, itemId));
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Error disconnecting item", error, { itemId: itemId });
    return Errors.internal();
  }
}
