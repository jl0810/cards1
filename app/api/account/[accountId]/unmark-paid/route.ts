/**
 * Unmark Account Paid API
 * Allows users to unmark credit card payments (undo mark as paid)
 *
 * @module app/api/account/[accountId]/unmark-paid
 * @implements BR-017 - Payment Tracking
 * @satisfies US-010 - Track Payments
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { plaidAccounts, accountExtended } from "@/db/schema";
import { eq } from "drizzle-orm";
import { Errors } from "@/lib/api-errors";
import { logger } from "@/lib/logger";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";

/**
 * Unmark an account payment (undo mark as paid)
 *
 * @route POST /api/account/[accountId]/unmark-paid
 * @tested None (needs test)
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ accountId: string }> },
) {
  // Rate limit: 20 writes per minute
  const limited = await rateLimit(req, RATE_LIMITS.write);
  if (limited) {
    return new Response("Too many requests", { status: 429 });
  }

  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Errors.unauthorized();
    }
    const { accountId } = await params;

    // Verify account exists
    const account = await db.query.plaidAccounts.findFirst({
      where: (table: any, { eq }: any) => eq(table.id, accountId),
    });

    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    // Clear the payment info and reset status in the extended record
    const [updatedExtended] = await db.insert(accountExtended)
      .values({
        plaidAccountId: accountId,
        paymentMarkedPaidDate: null,
        paymentMarkedPaidAmount: null,
        paymentCycleStatus: "STATEMENT_GENERATED",
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: accountExtended.plaidAccountId,
        set: {
          paymentMarkedPaidDate: null,
          paymentMarkedPaidAmount: null,
          paymentCycleStatus: "STATEMENT_GENERATED",
          updatedAt: new Date(),
        },
      })
      .returning();

    return NextResponse.json({
      success: true,
      data: updatedExtended,
      message: "Payment unmarked successfully",
    });
  } catch (error) {
    logger.error("Error unmarking account payment:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
