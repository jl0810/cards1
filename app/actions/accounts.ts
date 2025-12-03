"use server";

import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import * as Sentry from "@sentry/nextjs";
import { logger } from "@/lib/logger";

const UpdateAccountNicknameSchema = z.object({
  accountId: z.string().min(1, "Account ID is required"),
  nickname: z.string().max(100).nullable(),
});

export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> };

/**
 * Update the friendly name (nickname) for a Plaid account
 *
 * @satisfies US-007 - View Account Details (allows customization)
 * @param input - Account ID and new nickname
 * @returns Success or error result
 */
export async function updateAccountNickname(
  input: z.infer<typeof UpdateAccountNicknameSchema>,
): Promise<ActionResult<{ nickname: string | null }>> {
  // 1. Auth Check
  const { userId } = await auth();
  if (!userId) {
    return { success: false, error: "Unauthorized" };
  }

  // 2. Validation
  const validated = UpdateAccountNicknameSchema.safeParse(input);
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
    const userProfile = await prisma.userProfile.findUnique({
      where: { clerkId: userId },
    });

    if (!userProfile) {
      return { success: false, error: "User profile not found" };
    }

    // Check if account belongs to user's family
    const account = await prisma.plaidAccount.findFirst({
      where: {
        id: accountId,
        familyMember: {
          userId: userProfile.id,
        },
      },
    });

    if (!account) {
      return { success: false, error: "Account not found" };
    }

    // 4. Upsert AccountExtended with nickname
    const extended = await prisma.accountExtended.upsert({
      where: { plaidAccountId: accountId },
      create: {
        plaidAccountId: accountId,
        nickname: nickname,
      },
      update: {
        nickname: nickname,
      },
    });

    // 5. Revalidate
    revalidatePath("/dashboard");
    revalidatePath("/accounts");

    logger.info("Account nickname updated", { userId, accountId, nickname });

    return {
      success: true,
      data: { nickname: extended.nickname },
    };
  } catch (error) {
    Sentry.captureException(error, {
      user: { id: userId },
      extra: { action: "updateAccountNickname", accountId },
    });
    logger.error("Error updating account nickname", error, {
      userId,
      accountId,
    });
    return { success: false, error: "Failed to update account nickname" };
  }
}
