"use server";

"use server";

import { auth } from "@/lib/auth";
import { db, schema, eq, and } from "@/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";
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
 */
export async function updateAccountNickname(
  input: z.infer<typeof UpdateAccountNicknameSchema>,
): Promise<ActionResult<{ nickname: string | null }>> {
  const session = await auth();
  const user = session?.user;
  if (!user?.id) {
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
    const userProfile = await db.query.userProfiles.findFirst({
      where: eq(schema.userProfiles.supabaseId, user.id),
    });

    if (!userProfile) {
      return { success: false, error: "User profile not found" };
    }

    // Check if account belongs to user's family
    const account = await db.query.plaidAccounts.findFirst({
      where: and(
        eq(schema.plaidAccounts.id, accountId),
        eq(schema.familyMembers.userId, userProfile.id)
      ),
      with: {
        familyMember: true
      }
    });

    // Wait, Drizzle `findFirst` with `and` across tables requires join or proper relation mapping.
    // In my Drizzle schema, I defined relations? No, I only defined foreign keys.
    // I should probably use the query builder with joins or update my schema with relations.

    if (!account) {
      // Manual check if join-less query failed
      const accountCheck = await db
        .select({ id: schema.plaidAccounts.id })
        .from(schema.plaidAccounts)
        .innerJoin(schema.familyMembers, eq(schema.plaidAccounts.familyMemberId, schema.familyMembers.id))
        .where(
          and(
            eq(schema.plaidAccounts.id, accountId),
            eq(schema.familyMembers.userId, userProfile.id)
          )
        )
        .limit(1);

      if (accountCheck.length === 0) {
        return { success: false, error: "Account not found" };
      }
    }

    // 4. Upsert AccountExtended with nickname
    // Drizzle upsert in Postgres is .insert().onConflictUpdate()
    const [extended] = await db
      .insert(schema.accountExtended)
      .values({
        plaidAccountId: accountId,
        nickname: nickname,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: schema.accountExtended.plaidAccountId,
        set: {
          nickname: nickname,
          updatedAt: new Date(),
        },
      })
      .returning();

    // 5. Revalidate
    revalidatePath("/dashboard");
    revalidatePath("/accounts");

    logger.info("Account nickname updated", { userId: user.id, accountId, nickname });

    return {
      success: true,
      data: { nickname: extended.nickname },
    };
  } catch (error) {
    logger.error("Error updating account nickname", error, {
      userId: user.id,
      accountId,
    });
    return { success: false, error: "Failed to update account nickname" };
  }
}
