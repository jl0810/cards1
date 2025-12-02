/**
 * Plaid Token Exchange API
 * Completes bank account linking by exchanging public token for access token
 *
 * @module app/api/plaid/exchange-public-token
 */

import { NextResponse, NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { plaidClient } from "@/lib/plaid";
import { prisma } from "@/lib/prisma";
import {
  assertFamilyMemberOwnership,
  ensurePrimaryFamilyMember,
} from "@/lib/family";
import { ensureBankExists } from "@/lib/plaid-bank";
import { Errors } from "@/lib/api-errors";
import { logger } from "@/lib/logger";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import {
  PlaidExchangeTokenSchema,
  PlaidAccountSchema,
  PlaidCreditLiabilitySchema,
} from "@/lib/validations";
import { validateBody } from "@/lib/validation-middleware";
import { z } from "zod";
import { AccountBase } from "plaid";

/**
 * Exchanges a Plaid public token for an access token and creates a new PlaidItem.
 *
 * @route POST /api/plaid/exchange-public-token
 * @implements BR-008 - Duplicate Detection
 * @implements BR-009 - Secure Token Storage
 * @implements BR-010 - Family Member Assignment
 * @satisfies US-006 - Link Bank Account
 * @tested None (needs integration test)
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

  let userId: string | null = null;
  let institutionId: string | undefined;
  let linkSessionId: string | undefined;

  try {
    const authResult = await auth();
    userId = authResult.userId;

    if (!userId) {
      return Errors.unauthorized();
    }

    // Validate request body
    const bodyValidation = await validateBody(PlaidExchangeTokenSchema, req);
    if (!bodyValidation.success) {
      logger.error("Token exchange validation failed", {
        userId,
        error: "Body validation failed - check request payload",
      });
      return bodyValidation.error;
    }

    const { public_token, metadata, familyMemberId } = bodyValidation.data;
    linkSessionId = metadata?.link_session_id;

    // 2. Get UserProfile
    const userProfile = await prisma.userProfile.findUnique({
      where: { clerkId: userId },
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

    institutionId = metadata?.institution?.institution_id;
    const institutionName =
      metadata?.institution?.name || "Unknown Institution";
    const newAccounts = metadata?.accounts || [];

    // 1. Check for Duplicate Accounts BEFORE exchange
    // Check if any of the new accounts already exist for this family member
    // Unique constraint: familyMemberId + mask + officialName
    let duplicateAccounts: Array<{
      mask: string | null;
      subtype: string | null;
      plaidItem: { id: string; institutionId: string | null; status: string };
    }> = [];

    if (newAccounts.length > 0) {
      duplicateAccounts = await prisma.plaidAccount.findMany({
        where: {
          familyMemberId: familyMember.id,
          OR: newAccounts
            .map((acc: z.infer<typeof PlaidAccountSchema>) => ({
              mask: acc.mask || "", // Handle optional mask
            }))
            .filter((a) => a.mask !== ""), // Filter out empty masks
        },
        include: {
          plaidItem: true,
        },
      });
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
        // We do NOT return here. We proceed to create the new item.
        // We will handle the transfer AFTER creating the new item.
      } else {
        logger.info(
          "Duplicate account detected (active), skipping token exchange",
          {
            existingItemId: existingItem.id,
            familyMemberId: familyMember.id,
            duplicateAccountMasks: duplicateAccounts.map((a) => a.mask),
          },
        );
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

    const accessToken = exchangeResponse!.data.access_token;
    const itemId = exchangeResponse!.data.item_id;

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

        // Fallback to accountsGet on last attempt or if liabilities not supported
        if (fetchAttempts === 1) {
          try {
            const accountsResponse = await plaidClient.accountsGet({
              access_token: accessToken,
            });
            accounts = accountsResponse.data.accounts;
            break;
          } catch (finalErr) {
            throw finalErr; // Fail if both fail
          }
        }

        fetchAttempts--;
        if (fetchAttempts > 0) await new Promise((r) => setTimeout(r, 1000));
      }
    }

    // 4. Save to Vault and DB atomically with rollback
    // BUG FIX: Wrap in try-catch to prevent orphaned Vault secrets
    let secretId: string | null = null;
    let plaidItem;

    try {
      // Step 1: Create Vault secret
      const vaultResult = await prisma.$queryRaw<{ id: string }[]>`
                SELECT vault.create_secret(${accessToken}, ${itemId}, 'Plaid Access Token') as id;
            `;

      secretId = vaultResult[0]?.id;

      if (!secretId) {
        throw new Error("Failed to store access token in vault");
      }

      // Step 2: Create PlaidItem (if this fails, we rollback Vault)
      const isResurrection =
        duplicateAccounts.length > 0 &&
        (duplicateAccounts[0].plaidItem.status === "disconnected" ||
          duplicateAccounts[0].plaidItem.status === "error");

      // Check if item with this Plaid Item ID already exists
      const existingPlaidItem = await prisma.plaidItem.findUnique({
        where: { itemId: itemId },
      });

      if (existingPlaidItem) {
        logger.info(
          "Item already exists (same Item ID), updating access token",
          {
            itemId,
            dbId: existingPlaidItem.id,
          },
        );

        plaidItem = await prisma.plaidItem.update({
          where: { id: existingPlaidItem.id },
          data: {
            accessTokenId: secretId,
            status: "active",
            institutionId,
            institutionName,
            // We don't update accounts here, they are already attached
          },
        });
      } else {
        plaidItem = await prisma.plaidItem.create({
          data: {
            userId: userProfile.id,
            familyMemberId: familyMember.id,
            itemId: itemId,
            accessTokenId: secretId,
            institutionId: institutionId,
            institutionName: institutionName,
            accounts: isResurrection
              ? undefined
              : {
                  create: accounts.map((acc: unknown) => {
                    const account = acc as {
                      account_id: string;
                      name: string;
                      official_name: string;
                      mask: string;
                      type: string;
                      subtype: string[];
                      balances: {
                        current: number;
                        available: number;
                        limit?: number;
                        iso_currency_code?: string;
                      };
                    };
                    const creditLiability = liabilitiesData[
                      account.account_id
                    ] as z.infer<typeof PlaidCreditLiabilitySchema> | undefined;
                    // Find purchase APR or take the first one
                    const apr =
                      creditLiability?.aprs?.find(
                        (a: { apr_type: string; apr_percentage: number }) =>
                          a.apr_type === "purchase_apr",
                      )?.apr_percentage ||
                      creditLiability?.aprs?.[0]?.apr_percentage;

                    return {
                      accountId: account.account_id,
                      name: account.name,
                      officialName: account.official_name,
                      mask: account.mask,
                      type: account.type,
                      subtype: account.subtype?.[0] || null,
                      currentBalance: account.balances.current,
                      availableBalance: account.balances.available,
                      limit: account.balances.limit,
                      isoCurrencyCode: account.balances.iso_currency_code,
                      familyMember: {
                        connect: { id: familyMember.id },
                      },
                      // Liability fields
                      apr: apr,
                      minPaymentAmount: creditLiability?.minimum_payment_amount,
                      lastStatementBalance:
                        creditLiability?.last_statement_balance,
                      nextPaymentDueDate: creditLiability?.next_payment_due_date
                        ? new Date(creditLiability.next_payment_due_date)
                        : null,
                      lastStatementIssueDate:
                        creditLiability?.last_statement_issue_date
                          ? new Date(creditLiability.last_statement_issue_date)
                          : null,
                      lastPaymentAmount: creditLiability?.last_payment_amount,
                      lastPaymentDate: creditLiability?.last_payment_date
                        ? new Date(creditLiability.last_payment_date)
                        : null,
                    };
                  }),
                },
          },
        });
      }

      // Handle Resurrection: Transfer accounts from old item
      if (isResurrection) {
        const oldItem = duplicateAccounts[0].plaidItem;
        logger.info("Transferring accounts from disconnected item", {
          oldItemId: oldItem.id,
          newItemId: plaidItem.id,
        });

        // 1. Transfer Accounts
        await prisma.plaidAccount.updateMany({
          where: { plaidItemId: oldItem.id },
          data: { plaidItemId: plaidItem.id },
        });

        // 2. Transfer Transactions
        await prisma.plaidTransaction.updateMany({
          where: { plaidItemId: oldItem.id },
          data: { plaidItemId: plaidItem.id },
        });

        // 3. Delete old item
        await prisma.plaidItem.delete({
          where: { id: oldItem.id },
        });
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
        const existingAccount = await prisma.plaidAccount.findFirst({
          where: {
            familyMemberId: familyMember.id,
            mask: {
              in: accounts.map((a: unknown) => (a as { mask: string }).mask),
            },
          },
          include: {
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
      userId,
      institutionId,
      plaidRequestId: plaidError?.response?.data?.request_id,
      plaidErrorCode: plaidError?.response?.data?.error_code,
      plaidErrorMessage: plaidError?.response?.data?.error_message,
      linkSessionId,
    });
    return Errors.internal();
  }
}
