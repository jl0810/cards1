/**
 * Plaid Item Health Check API
 * Checks connection status and token validity via Plaid API
 *
 * @module app/api/plaid/items/[itemId]/status
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, schema, eq, and, sql } from "@/db";
import { plaidClient } from "@/lib/plaid";
import { logger } from "@/lib/logger";

/**
 * Get current item status from Plaid
 *
 * @route GET /api/plaid/items/[itemId]/status
 * @implements BR-033 - Connection Health Monitoring
 * @satisfies US-020 - Monitor Bank Connection Health
 * @tested __tests__/api/plaid/items/status.integration.test.ts
 *
 * @param {Request} req - HTTP request
 * @param {Object} params - Route parameters
 * @param {string} params.itemId - ID of Plaid item to check
 * @returns {Promise<NextResponse>} Status object with health indicators
 */
export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ itemId: string }> },
) {
  try {
    const { itemId } = await params;
    const session = await auth();
    const user = session?.user;
    if (!user?.id) return new NextResponse("Unauthorized", { status: 401 });

    const userProfile = await db.query.userProfiles.findFirst({
      where: eq(schema.userProfiles.supabaseId, user.id),
    });
    if (!userProfile)
      return new NextResponse("User not found", { status: 404 });

    // Get the PlaidItem
    const plaidItem = await db.query.plaidItems.findFirst({
      where: and(
        eq(schema.plaidItems.id, itemId),
        eq(schema.plaidItems.userId, userProfile.id),
      ),
    });

    if (!plaidItem) return new NextResponse("Item not found", { status: 404 });

    // Get access token from Supabase Vault
    const secretId = plaidItem.accessTokenId;
    const vaultResult = await db.execute(sql`
            SELECT decrypted_secret FROM vault.decrypted_secrets WHERE id = ${secretId}::uuid;
        `);

    const accessToken = (vaultResult as unknown as { decrypted_secret: string }[])[0]?.decrypted_secret;
    if (!accessToken) {
      return new NextResponse("Access token not found", { status: 404 });
    }

    // Call Plaid's /item/get endpoint
    const itemResponse = await plaidClient.itemGet({
      access_token: accessToken,
    });

    const item = itemResponse.data.item;

    // Determine status
    let status = "active";
    if (item.error) {
      if (item.error.error_code === "ITEM_LOGIN_REQUIRED") {
        status = "needs_reauth";
      } else {
        status = "error";
      }
    }

    // Update status in database
    await db.update(schema.plaidItems)
      .set({
        status,
        lastSyncedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(schema.plaidItems.id, itemId));

    return NextResponse.json({
      status,
      institutionId: item.institution_id,
      consentExpirationTime: item.consent_expiration_time,
      error: item.error,
    });
  } catch (error) {
    const plaidError = (
      error as { response?: { data?: { error_code?: string } } }
    )?.response?.data;

    if (plaidError) {
      let newStatus = "active";
      let shouldUpdate = false;

      if (plaidError.error_code === "ITEM_NOT_FOUND") {
        newStatus = "disconnected";
        shouldUpdate = true;
      } else if (plaidError.error_code === "ITEM_LOGIN_REQUIRED") {
        newStatus = "needs_reauth";
        shouldUpdate = true;
      }

      if (shouldUpdate) {
        await db.update(schema.plaidItems)
          .set({
            status: newStatus,
            lastSyncedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(schema.plaidItems.id, (await params).itemId));

        return NextResponse.json({
          status: newStatus,
          error: plaidError,
        });
      }
    }

    logger.error("Error checking item status", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
