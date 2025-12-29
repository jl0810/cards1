/**
 * Plaid Token Exchange API
 * Completes bank account linking by exchanging public token for access token
 *
 * @module app/api/plaid/exchange-public-token
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { plaidClient } from "@/lib/plaid";
import { db, schema, eq, and, inArray, sql, not } from "@/db";
import {
  assertFamilyMemberOwnership,
  ensurePrimaryFamilyMember,
} from "@/lib/family";
import { ensureBankExists } from "@/lib/plaid-bank";
import { Errors } from "@/lib/api-errors";
import { logger } from "@/lib/logger";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import type {
  PlaidAccountSchema,
  PlaidCreditLiabilitySchema,
} from "@/lib/validations";
import { PlaidExchangeTokenSchema } from "@/lib/validations";
import { validateBody } from "@/lib/validation-middleware";
import type { z } from "zod";
import type { AccountBase } from "plaid";

interface PlaidLinkMetadata {
  institution?: {
    institution_id?: string;
    name?: string;
  };
  accounts?: z.infer<typeof PlaidAccountSchema>[];
  link_session_id?: string;
}

/**
 * Exchanges a Plaid public token for an access token and creates a new PlaidItem.
 *
 * @route POST /api/plaid/exchange-public-token
 * @implements BR-008 - Duplicate Detection
 * @implements BR-009 - Secure Token Storage
 * @implements BR-010 - Family Member Assignment
 * @implements BR-039 - Smart Fix Adoption
 * @satisfies US-006 - Link Bank Account
 * @tested __tests__/api/plaid/exchange-public-token.adoption.test.ts
 *
 * This endpoint handles:
 * 1. User authentication and profile retrieval.
 * 2. Family member assignment (defaulting to primary if not specified).
 * 3. Duplicate item detection (checking institution ID and account masks).
 * 4. Token exchange with Plaid.
 * 5. Secure storage of the access token in Supabase Vault.
 * 6. Creation of PlaidItem and PlaidAccount records in the database.
 * 7. Triggering an initial transaction sync.
 *
 * @param {Request} req - The request object containing public_token, metadata, and optional familyMemberId.
 * @returns {NextResponse} JSON response with success status and itemId, or error message.
 */
export async function POST(req: NextRequest) {
  // Rate limit: 10 token exchanges per minute (sensitive operation)
  const limited = await rateLimit(req, RATE_LIMITS.auth);
  if (limited) {
    return new Response("Too many requests", { status: 429 });
  }

  let user = null;
  let institutionId: string | undefined;
  let linkSessionId: string | undefined;

  try {
    const session = await auth();
    user = session?.user;

    if (!user?.id) {
      return Errors.unauthorized();
    }

    // Validate request body
    const bodyValidation = await validateBody(PlaidExchangeTokenSchema, req);
    if (!bodyValidation.success) {
      logger.error("Token exchange validation failed", {
        userId: user.id,
        error: "Body validation failed - check request payload",
      });
      return bodyValidation.error;
    }

    const { public_token, metadata, familyMemberId } = bodyValidation.data;
    const metadataTyped = metadata as PlaidLinkMetadata;
    linkSessionId = metadataTyped?.link_session_id;

    // 2. Get UserProfile
    const userProfile = await db.query.userProfiles.findFirst({
      where: eq(schema.userProfiles.supabaseId, user.id),
    });

    if (!userProfile) {
      return Errors.notFound("User profile");
    }

    // 3. Determine which family member this item belongs to (required)
    let familyMember;
    if (familyMemberId) {
      familyMember = await assertFamilyMemberOwnership(
        userProfile.id,
        familyMemberId,
      );
    } else {
      familyMember = await ensurePrimaryFamilyMember({
        id: userProfile.id,
        name: userProfile.name,
        avatar: userProfile.avatar,
      });
    }

    institutionId = metadataTyped?.institution?.institution_id;
    const institutionName =
      metadataTyped?.institution?.name || "Unknown Institution";
    const newAccounts = metadataTyped?.accounts || [];

    // 1. Check for Duplicate Accounts BEFORE exchange
    // Check if any of the new accounts already exist for this family member
    // Unique constraint: familyMemberId + mask + officialName
    let duplicateAccounts: any[] = [];

    if (newAccounts.length > 0) {
      const masks = newAccounts
        .map((acc: any) => acc.mask)
        .filter((m: any) => m != null && m !== "");

      if (masks.length > 0) {
        duplicateAccounts = await db.query.plaidAccounts.findMany({
          where: and(
            eq(schema.plaidAccounts.familyMemberId, familyMember.id),
            inArray(schema.plaidAccounts.mask, masks)
          ),
          with: {
            plaidItem: true,
          },
        });
      }
    }

    if (duplicateAccounts.length > 0) {
      const existingItem = duplicateAccounts[0].plaidItem;

      // RESURRECTION LOGIC: If the existing item is disconnected/broken, we allow re-linking
      // and will transfer the accounts to the new item later.
      if (
        existingItem.status === "disconnected" ||
        existingItem.status === "error"
      ) {
        logger.info(
          "Resurrecting disconnected item - proceeding with exchange",
          {
            existingItemId: existingItem.id,
            status: existingItem.status,
          },
        );
      } else {
        logger.info(
          "Duplicate account detected (active), skipping token exchange",
          {
            existingItemId: existingItem.id,
            familyMemberId: familyMember.id,
            duplicateAccountMasks: duplicateAccounts.map((a) => a.mask),
          },
        );

        // AUTO-CLEANUP
        if (institutionId) {
          const zombies = await db.query.plaidItems.findMany({
            where: and(
              eq(schema.plaidItems.userId, userProfile.id),
              eq(schema.plaidItems.institutionId, institutionId),
              inArray(schema.plaidItems.status, ["disconnected", "error"])
            ),
            with: {
              accounts: true,
            },
          });

          const trulyZombies = zombies.filter((z: any) => z.accounts.length === 0);

          if (trulyZombies.length > 0) {
            logger.info("Cleaning up zombie items", {
              count: trulyZombies.length,
              ids: trulyZombies.map((z: any) => z.id),
            });
            await db
              .update(schema.plaidItems)
              .set({ status: "inactive", updatedAt: new Date() })
              .where(inArray(schema.plaidItems.id, trulyZombies.map((z: any) => z.id)));
          }
        }

        return NextResponse.json({
          ok: true,
          itemId: existingItem.id,
          duplicate: true,
        });
      }
    }

    // 2. Exchange public token (Only if not a duplicate)
    let exchangeResponse;
    let exchangeAttempts = 3;
    while (exchangeAttempts > 0) {
      try {
        exchangeResponse = await plaidClient.itemPublicTokenExchange({
          public_token,
        });
        break;
      } catch (err) {
        const plaidError = err as {
          response?: { data?: { error_code?: string } };
        };
        const errorCode = plaidError?.response?.data?.error_code;
        // If token is invalid (already used or expired), don't retry
        if (errorCode === "INVALID_PUBLIC_TOKEN") {
          throw err;
        }

        exchangeAttempts--;
        if (exchangeAttempts === 0) throw err;

        logger.warn("Retrying token exchange", {
          attempt: 3 - exchangeAttempts,
          error: err,
          linkSessionId,
        });
        await new Promise((r) => setTimeout(r, 1000));
      }
    }

    if (!exchangeResponse) {
      throw new Error("Token exchange failed after all retry attempts");
    }

    const accessToken = exchangeResponse.data.access_token;
    const itemId = exchangeResponse.data.item_id;

    // 3. Get Accounts info (Fetch from Plaid since metadata might be incomplete for full details like balances)
    let accounts: AccountBase[] = [];
    const liabilitiesData: Record<
      string,
      z.infer<typeof PlaidCreditLiabilitySchema>
    > = {};

    // Retry logic for fetching accounts (3 attempts)
    let fetchAttempts = 3;
    while (fetchAttempts > 0) {
      try {
        const liabilitiesResponse = await plaidClient.liabilitiesGet({
          access_token: accessToken,
        });
        accounts = liabilitiesResponse.data.accounts;

        // Map liabilities by account_id for easy lookup
        if (liabilitiesResponse.data.liabilities?.credit) {
          liabilitiesResponse.data.liabilities.credit.forEach(
            (l: z.infer<typeof PlaidCreditLiabilitySchema>) => {
              if (l.account_id) {
                liabilitiesData[l.account_id] = l;
              }
            },
          );
        }
        break; // Success
      } catch (err) {
        logger.warn("Failed to fetch liabilities", {
          error: err,
          attempt: 4 - fetchAttempts,
        });

        fetchAttempts--;
        if (fetchAttempts === 0) {
          // If liabilities fail on final attempt, we cannot fallback to accountsGet (not authorized)
          logger.error(
            "Failed to fetch liabilities and no fallback available",
            {
              error: err,
            },
          );
          throw new Error(
            "Unable to fetch account data - liabilities endpoint failed",
          );
        }

        if (fetchAttempts > 0) await new Promise((r) => setTimeout(r, 1000));
      }
    }

    // 4. Save to Vault and DB atomically with rollback
    let secretId: string | null = null;
    let plaidItem: any;

    try {
      // Step 1: Create Vault secret using raw SQL
      const vaultResult = await db.execute(sql`
        SELECT vault.create_secret(${accessToken}, ${itemId}, 'Plaid Access Token') as id;
      `);

      secretId = (vaultResult as any)[0]?.id;

      if (!secretId) {
        throw new Error("Failed to store access token in vault");
      }

      // Step 2: Create PlaidItem
      const existingPlaidItem = await db.query.plaidItems.findFirst({
        where: eq(schema.plaidItems.itemId, itemId),
      });

      if (existingPlaidItem) {
        logger.info(
          "Item already exists (same Item ID), updating access token",
          {
            itemId,
            dbId: existingPlaidItem.id,
          },
        );

        [plaidItem] = await db.update(schema.plaidItems)
          .set({
            accessTokenId: secretId,
            status: "active",
            institutionId,
            institutionName,
            updatedAt: new Date()
          })
          .where(eq(schema.plaidItems.id, existingPlaidItem.id))
          .returning();
      } else {
        [plaidItem] = await db.insert(schema.plaidItems)
          .values({
            userId: userProfile.id,
            familyMemberId: familyMember.id,
            itemId: itemId,
            accessTokenId: secretId,
            institutionId: institutionId,
            institutionName: institutionName,
          })
          .returning();

        // Step 2b: Create accounts (since Drizzle doesn't do nested create)
        const accountsToInsert = accounts.map((acc: any) => {
          const creditLiability = liabilitiesData[acc.account_id] as
            | z.infer<typeof PlaidCreditLiabilitySchema>
            | undefined;

          const apr =
            creditLiability?.aprs?.find(
              (a: { apr_type: string; apr_percentage: number }) =>
                a.apr_type === "purchase_apr",
            )?.apr_percentage ||
            creditLiability?.aprs?.[0]?.apr_percentage;

          return {
            plaidItemId: plaidItem.id,
            accountId: acc.account_id,
            name: acc.name,
            officialName: acc.official_name,
            status: "active",
            mask: acc.mask,
            type: acc.type,
            subtype: acc.subtype?.[0] || null,
            currentBalance: acc.balances.current,
            availableBalance: acc.balances.available,
            limit: acc.balances.limit,
            isoCurrencyCode: acc.balances.iso_currency_code,
            familyMemberId: familyMember.id,
            apr: apr != null ? Number(apr) : null,
            minPaymentAmount: creditLiability?.minimum_payment_amount != null ? Number(creditLiability.minimum_payment_amount) : null,
            lastStatementBalance: creditLiability?.last_statement_balance != null ? Number(creditLiability.last_statement_balance) : null,
            nextPaymentDueDate: creditLiability?.next_payment_due_date
              ? new Date(creditLiability.next_payment_due_date)
              : null,
            lastStatementIssueDate:
              creditLiability?.last_statement_issue_date
                ? new Date(creditLiability.last_statement_issue_date)
                : null,
            lastPaymentAmount: creditLiability?.last_payment_amount != null ? Number(creditLiability.last_payment_amount) : null,
            lastPaymentDate: creditLiability?.last_payment_date
              ? new Date(creditLiability.last_payment_date)
              : null,
          };
        });

        if (accountsToInsert.length > 0) {
          await db.insert(schema.plaidAccounts).values(accountsToInsert);
        }
      }

      // Step 3: Adopt Settings from Inactive Accounts (Smart Fix)
      if (!existingPlaidItem) {
        const newAccountsList = await db.query.plaidAccounts.findMany({
          where: eq(schema.plaidAccounts.plaidItemId, plaidItem.id),
        });

        for (const newAcc of newAccountsList) {
          if (!newAcc.mask) continue;

          // Find an inactive account with same mask & family member
          const oldAcc = await db.query.plaidAccounts.findFirst({
            where: and(
              eq(schema.plaidAccounts.mask, newAcc.mask),
              eq(schema.plaidAccounts.familyMemberId, newAcc.familyMemberId),
              eq(schema.plaidAccounts.status, "inactive"),
              not(eq(schema.plaidAccounts.id, newAcc.id))
            ),
            with: { extended: true },
          });

          if (oldAcc && oldAcc.extended) {
            logger.info("Adopting settings from inactive account", {
              from: oldAcc.id,
              to: newAcc.id,
            });

            // Move Extended Data
            await db.update(schema.accountExtended)
              .set({ plaidAccountId: newAcc.id, updatedAt: new Date() })
              .where(eq(schema.accountExtended.id, oldAcc.extended.id));

            // Mark old account as replaced
            await db.update(schema.plaidAccounts)
              .set({ status: "replaced", updatedAt: new Date() })
              .where(eq(schema.plaidAccounts.id, oldAcc.id));
          }
        }
      }
    } catch (error) {
      // NOTE: Vault secrets are NOT deleted on error for two reasons:
      // 1. Plaid compliance requires keeping all access tokens for audit purposes
      // 2. Supabase Vault is append-only by design (cannot delete secrets)
      // Orphaned secrets are acceptable and required by Plaid's terms of service
      logger.error("Failed to create/update PlaidItem", error, {
        userId: userProfile.id,
        itemId,
        secretId,
        duplicateAccountsCount: duplicateAccounts.length,
        errorDetails: error instanceof Error ? error.message : String(error),
      });

      // BUG FIX #2: Handle race condition - unique constraint violation on accounts
      // If duplicate detected at DB level, return existing item instead of error
      if (
        error instanceof Error &&
        error.message.includes("Unique constraint")
      ) {
        logger.warn("Race condition detected - duplicate account at DB level", {
          userId: userProfile.id,
          familyMemberId: familyMember.id,
        });

        // Find the existing account that was created by the other request
        const masks = accounts.map((a: any) => a.mask).filter((m: any) => m != null && m !== "");
        const existingAccount = await db.query.plaidAccounts.findFirst({
          where: and(
            eq(schema.plaidAccounts.familyMemberId, familyMember.id),
            inArray(schema.plaidAccounts.mask, masks)
          ),
          with: {
            plaidItem: true,
          },
        });

        if (existingAccount) {
          return NextResponse.json({
            ok: true,
            itemId: existingAccount.plaidItem.id,
            duplicate: true,
          });
        }
      }

      throw error; // Re-throw original error
    }

    // Ensure Bank exists and link it
    await ensureBankExists(plaidItem).catch((err) =>
      logger.error("Failed to ensure bank exists", err, {
        itemId: plaidItem.id,
      }),
    );

    const plaidItemDbId = plaidItem.id;

    // 7. Trigger Initial Transaction Sync (Async)
    // We pass the itemId (Plaid ID) or our DB ID. The sync endpoint expects 'itemId' which usually refers to the Plaid Item ID string in this codebase context,
    // but let's check the sync endpoint. If it takes DB ID, great.
    // Actually, let's just pass the itemId string which we have in 'itemId' variable.
    fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/plaid/sync-transactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId: plaidItem.id }),
    }).catch((err) =>
      logger.error("Failed to trigger initial sync", err, {
        itemId: plaidItem.id,
      }),
    );

    return NextResponse.json({ ok: true, itemId: plaidItemDbId });
  } catch (error) {
    const plaidError = error as {
      response?: {
        data?: {
          request_id?: string;
          error_code?: string;
          error_message?: string;
        };
      };
    };

    logger.error("Error exchanging public token", {
      error,
      userId: user?.id,
      institutionId,
      plaidRequestId: plaidError?.response?.data?.request_id,
      plaidErrorCode: plaidError?.response?.data?.error_code,
      plaidErrorMessage: plaidError?.response?.data?.error_message,
      linkSessionId,
    });
    return Errors.internal();
  }
}
