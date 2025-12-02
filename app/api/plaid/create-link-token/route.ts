/**
 * Plaid Link Token Creation API
 * Creates a Plaid Link token for initiating bank account connection
 *
 * @module app/api/plaid/create-link-token
 */

import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { plaidClient } from "@/lib/plaid";
import { prisma } from "@/lib/prisma";
import { CountryCode, Products } from "plaid";
import { Errors } from "@/lib/api-errors";
import { logger } from "@/lib/logger";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";

/**
 * Create Plaid Link token for bank account connection
 *
 * @route POST /api/plaid/create-link-token
 * @implements BR-008 - Duplicate Detection (preparation)
 * @satisfies US-006 - Link Bank Account
 * @tested __tests__/api/plaid/create-link-token.test.ts
 *
 * @returns {Promise<NextResponse>} Plaid link token for frontend initialization
 */
export async function POST(req: Request) {
  // Rate limit: 10 auth operations per minute
  const limited = await rateLimit(req, RATE_LIMITS.auth);
  if (limited) {
    return new Response("Too many requests", { status: 429 });
  }

  try {
    const { userId } = await auth();
    const user = await currentUser();

    if (!userId || !user) {
      return Errors.unauthorized();
    }

    // Ensure user profile exists
    let userProfile = await prisma.userProfile.findUnique({
      where: { clerkId: userId },
    });

    if (!userProfile) {
      try {
        userProfile = await prisma.userProfile.create({
          data: {
            clerkId: userId,
            name: user.firstName || "",
            avatar: user.imageUrl,
          },
        });
      } catch (e) {
        logger.error("Error creating profile in link token route", e, {
          userId,
        });
      }
    }

    const request = {
      user: {
        client_user_id: userId,
      },
      client_name: "Cards App",
      products: [Products.Transactions, Products.Liabilities],
      country_codes: [CountryCode.Us],
      language: "en",
      webhook: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/plaid`,
    };

    const createTokenResponse = await plaidClient.linkTokenCreate(request);

    return NextResponse.json(createTokenResponse.data);
  } catch (error) {
    logger.error("Error creating link token", error);
    return Errors.internal();
  }
}
