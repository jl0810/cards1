"use server";

/**
 * Account Server Actions
 * Handles account-related mutations (mark paid, nickname)
 *
 * @module app/actions/accounts
 * @implements BR-016 - Account Nickname Persistence
 * @implements BR-017 - Payment Tracking
 * @satisfies US-009 - Nickname Accounts
 * @satisfies US-010 - Track Payments
 */

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import * as Sentry from "@sentry/nextjs";

// ============================================================================
// Schemas
// ============================================================================

const MarkPaidSchema = z.object({
  accountId: z.string().min(1, "Account ID is required"),
  amount: z.number().optional(),
  date: z.string().datetime().optional(),
});

const UpdateNicknameSchema = z.object({
  accountId: z.string().min(1, "Account ID is required"),
  nickname: z.string().max(50).nullable(),
});

// ============================================================================
// Types
// ============================================================================

type ActionResult<T = unknown> =
  | { success: true; data: T }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> };

// ============================================================================
// Actions
// ============================================================================

/**
 * Mark a credit card account payment as paid
 *
 * @implements BR-017 - Payment Tracking
 * @satisfies US-010 - Track Payments
 */
export async function markAccountPaid(
  input: z.infer<typeof MarkPaidSchema>,
): Promise<ActionResult<{ paidDate: Date; paidAmount: number }>> {
  // 1. Auth Check
  const { userId } = await auth();
  if (!userId) {
    return { success: false, error: "Unauthorized" };
  }

  // 2. Validation
  const validated = MarkPaidSchema.safeParse(input);
  if (!validated.success) {
    return {
      success: false,
      error: "Validation failed",
      fieldErrors: validated.error.flatten().fieldErrors,
    };
  }

  const { accountId, amount, date } = validated.data;
  const paidDate = date ? new Date(date) : new Date();

  try {
    // 3. Verify account exists and get balance for default amount
    const account = await prisma.plaidAccount.findUnique({
      where: { id: accountId },
      include: {
        extended: true,
        plaidItem: { select: { userId: true } },
      },
    });

    if (!account) {
      return { success: false, error: "Account not found" };
    }

    // Verify ownership through the Plaid item
    const userProfile = await prisma.userProfile.findUnique({
      where: { clerkId: userId },
    });

    if (!userProfile || account.plaidItem.userId !== userProfile.id) {
      return { success: false, error: "Access denied" };
    }

    // 4. Mutation
    const paidAmount = amount ?? account.lastStatementBalance ?? 0;

    await prisma.accountExtended.upsert({
      where: { plaidAccountId: accountId },
      create: {
        plaidAccountId: accountId,
        paymentMarkedPaidDate: paidDate,
        paymentMarkedPaidAmount: paidAmount,
      },
      update: {
        paymentMarkedPaidDate: paidDate,
        paymentMarkedPaidAmount: paidAmount,
      },
    });

    // 5. Revalidate
    revalidatePath("/dashboard");

    logger.info("Payment marked as paid", { accountId, userId, paidAmount });

    return {
      success: true,
      data: { paidDate, paidAmount },
    };
  } catch (error) {
    Sentry.captureException(error, {
      user: { id: userId },
      extra: { action: "markAccountPaid", accountId },
    });
    logger.error("Error marking account as paid", error, { accountId, userId });
    return { success: false, error: "Failed to mark payment" };
  }
}

/**
 * Update account nickname
 *
 * @implements BR-016 - Account Nickname Persistence
 * @satisfies US-009 - Nickname Accounts
 */
export async function updateAccountNickname(
  input: z.infer<typeof UpdateNicknameSchema>,
): Promise<ActionResult<{ nickname: string | null }>> {
  // 1. Auth Check
  const { userId } = await auth();
  if (!userId) {
    return { success: false, error: "Unauthorized" };
  }

  // 2. Validation
  const validated = UpdateNicknameSchema.safeParse(input);
  if (!validated.success) {
    return {
      success: false,
      error: "Validation failed",
      fieldErrors: validated.error.flatten().fieldErrors,
    };
  }

  const { accountId, nickname } = validated.data;

  try {
    // 3. Verify ownership
    const account = await prisma.plaidAccount.findUnique({
      where: { accountId: accountId },
      include: { plaidItem: { select: { userId: true } } },
    });

    if (!account) {
      return { success: false, error: "Account not found" };
    }

    const userProfile = await prisma.userProfile.findUnique({
      where: { clerkId: userId },
    });

    if (!userProfile || account.plaidItem.userId !== userProfile.id) {
      return { success: false, error: "Access denied" };
    }

    // 4. Mutation
    await prisma.accountExtended.upsert({
      where: { plaidAccountId: account.id },
      update: { nickname },
      create: {
        plaidAccountId: account.id,
        nickname,
      },
    });

    // 5. Revalidate
    revalidatePath("/dashboard");

    logger.info("Account nickname updated", { accountId, userId, nickname });

    return {
      success: true,
      data: { nickname },
    };
  } catch (error) {
    Sentry.captureException(error, {
      user: { id: userId },
      extra: { action: "updateAccountNickname", accountId },
    });
    logger.error("Error updating account nickname", error, {
      accountId,
      userId,
    });
    return { success: false, error: "Failed to update nickname" };
  }
}
