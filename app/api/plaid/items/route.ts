/**
 * Plaid Items API
 * Returns all connected bank accounts (Plaid items) for user
 *
 * @module app/api/plaid/items
 */

import { auth } from "@/lib/auth";
import { db, schema, eq } from "@/db";
import { Errors, successResponse } from "@/lib/api-errors";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * Get all Plaid items (connected banks) for authenticated user
 *
 * @route GET /api/plaid/items
 * @implements BR-014 - Account Balance Display
 * @implements BR-015 - Due Date Calculation
 * @satisfies US-008 - View Connected Accounts
 * @tested __tests__/api/plaid/items.test.ts
 *
 * @returns {Promise<NextResponse>} Array of Plaid items with accounts and balances
 */
export async function GET(req: Request) {
  try {
    const session = await auth();
    const user = session?.user;

    if (!user?.id) {
      return Errors.unauthorized();
    }

    let userProfile = await db.query.userProfiles.findFirst({
      where: eq(schema.userProfiles.supabaseId, user.id),
    });

    if (!userProfile) {
      logger.info("User profile not found, attempting to create", { userId: user.id });
      // Self-healing: Create profile if missing
      try {
        const [newProfile] = await db.insert(schema.userProfiles).values({
          supabaseId: user.id,
          name: user.name || "",
          avatar: user.image || "",
        }).returning();
        userProfile = newProfile;
        logger.info("Created user profile", { userId: user.id });
      } catch (createError) {
        logger.error("Error creating user profile in API", createError, {
          userId: user.id,
        });
        // If creation fails (e.g. race condition), try fetching again
        userProfile = await db.query.userProfiles.findFirst({
          where: eq(schema.userProfiles.supabaseId, user.id),
        });
      }
    }

    if (!userProfile) {
      return Errors.notFound("User profile");
    }

    logger.info("Fetching items for user", {
      supabaseId: user.id,
      userProfileId: userProfile.id,
      userName: userProfile.name,
    });

    const items = await db.query.plaidItems.findMany({
      where: eq(schema.plaidItems.userId, userProfile.id),
      with: {
        bank: true,
        accounts: {
          with: {
            extended: {
              with: {
                cardProduct: {
                  with: {
                    benefits: true,
                  },
                },
              },
            },
          },
        },
        familyMember: true,
      },
    });

    logger.info("Fetched Plaid items", {
      itemCount: items.length,
      firstItemId: items[0]?.id,
      firstItemAccounts: items[0]?.accounts?.length,
      sampleItem: items[0]
        ? {
          id: items[0].id,
          institutionName: items[0].institutionName,
          accountsCount: items[0].accounts?.length || 0,
          accountIds: items[0].accounts?.map((a: any) => a.id) || [],
        }
        : null,
    });

    return successResponse(items);
  } catch (error) {
    logger.error("Error fetching Plaid items", error);
    return Errors.internal(
      error instanceof Error ? error.message : "Unknown error",
    );
  }
}
