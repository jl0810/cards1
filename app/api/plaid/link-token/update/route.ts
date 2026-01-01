/**
 * Plaid Link Token Creation for Update Mode
 * Used to fix Items with ITEM_LOGIN_REQUIRED or other errors
 *
 * @module app/api/plaid/link-token/update
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, schema, eq, and, sql } from "@/db";
import { plaidClient } from "@/lib/plaid";
import { logger } from "@/lib/logger";
import { Errors } from "@/lib/api-errors";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { CountryCode, Products } from "plaid";

export const dynamic = "force-dynamic";

/**
 * Create Link token for update mode
 *
 * Update mode allows users to fix broken Items by re-authenticating
 * or granting additional permissions. The key difference from initial
 * Link flow is passing the existing access_token.
 *
 * @route POST /api/plaid/link-token/update
 * @implements BR-035 - Item Error Detection & Recovery
 * @satisfies US-020 - Monitor Bank Connection Health
 * @see https://plaid.com/docs/link/update-mode/
 *
 * @param {Request} req - HTTP request with { itemId: string }
 * @returns {Promise<NextResponse>} Link token for update mode
 */
export async function POST(req: Request) {
  // Rate limit: 10 requests per minute
  const limited = await rateLimit(req, RATE_LIMITS.default);
  if (limited) {
    return new Response("Too many requests", { status: 429 });
  }

  try {
    const session = await auth();
    const user = session?.user;
    if (!user?.id) return Errors.unauthorized();

    const { itemId } = await req.json();
    if (!itemId) return Errors.badRequest("itemId is required");

    const userProfile = await db.query.userProfiles.findFirst({
      where: eq(schema.userProfiles.supabaseId, user.id),
    });
    if (!userProfile) return Errors.notFound("User profile");

    // Get the PlaidItem (verify ownership)
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

    const accessToken = (vaultResult as unknown as { decrypted_secret: string }[])[0]?.decrypted_secret;
    if (!accessToken) {
      logger.error("Access token not found in Vault", {
        itemId,
        accessTokenId: plaidItem.accessTokenId,
      });
      return Errors.internal("Access token not found");
    }

    // Create link token in UPDATE mode
    // KEY: Pass existing access_token to enable update mode
    const response = await plaidClient.linkTokenCreate({
      user: { client_user_id: user.id },
      client_name: process.env.NEXT_PUBLIC_APP_NAME || "Card Tracker",
      access_token: accessToken, // This enables update mode!
      products: [Products.Transactions, Products.Liabilities], // Request Liabilities upgrade
      language: "en",
      country_codes: [CountryCode.Us],
    });

    logger.info("Created update mode link token", {
      itemId,
      institutionName: plaidItem.institutionName,
      linkToken: response.data.link_token.substring(0, 20) + "...",
    });

    return NextResponse.json({
      link_token: response.data.link_token,
      expiration: response.data.expiration,
    });
  } catch (error) {
    logger.error("Error creating update mode link token", error);
    return Errors.internal();
  }
}
