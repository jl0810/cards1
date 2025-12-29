/**
 * Mark Account Paid API
 * Allows users to mark credit card payments as made
 *
 * @module app/api/account/[accountId]/mark-paid
 * @implements BR-102 - Payment Tracking
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, schema, eq } from "@/db";
import { Errors } from "@/lib/api-errors";
import { logger } from "@/lib/logger";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { z } from "zod";

const markPaidSchema = z.object({
  amount: z.number().optional(),
  date: z.string().datetime().optional(), // ISO date string
});

/**
 * Mark an account payment as paid
 *
 * @route POST /api/account/[accountId]/mark-paid
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ accountId: string }> },
) {
  const limited = await rateLimit(req, RATE_LIMITS.write);
  if (limited) {
    return new Response("Too many requests", { status: 429 });
  }

  try {
    const session = await auth();
    const user = session?.user;
    const { accountId } = await params;
    if (!user?.id) {
      return Errors.unauthorized();
    }

    const body = await req.json();

    const result = markPaidSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid input", details: result.error },
        { status: 400 },
      );
    }

    const { amount, date } = result.data;
    const paidDate = date ? new Date(date) : new Date();

    // Verify account exists using Drizzle
    const account = await db.query.plaidAccounts.findFirst({
      where: eq(schema.plaidAccounts.id, accountId),
    });

    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    // Upsert the extended record using Drizzle
    const [updatedExtended] = await db.insert(schema.accountExtended)
      .values({
        plaidAccountId: accountId,
        paymentMarkedPaidDate: paidDate,
        paymentMarkedPaidAmount: amount || account.lastStatementBalance || 0,
        paymentCycleStatus: "PAYMENT_SCHEDULED",
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: schema.accountExtended.plaidAccountId,
        set: {
          paymentMarkedPaidDate: paidDate,
          paymentMarkedPaidAmount: amount || account.lastStatementBalance || 0,
          paymentCycleStatus: "PAYMENT_SCHEDULED",
          updatedAt: new Date(),
        },
      })
      .returning();

    return NextResponse.json({
      success: true,
      data: updatedExtended,
      message: "Payment marked successfully",
    });
  } catch (error) {
    logger.error("Error marking account as paid:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
