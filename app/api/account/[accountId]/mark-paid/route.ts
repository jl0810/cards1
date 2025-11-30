/**
 * Mark Account Paid API
 * Allows users to mark credit card payments as made
 * 
 * @module app/api/account/[accountId]/mark-paid
 * @implements BR-017 - Payment Tracking
 * @satisfies US-010 - Track Payments
 */

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { Errors } from "@/lib/api-errors";
import { logger } from "@/lib/logger";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";

const markPaidSchema = z.object({
    amount: z.number().optional(),
    date: z.string().datetime().optional(), // ISO date string
});

/**
 * Mark an account payment as paid
 * 
 * @route POST /api/account/[accountId]/mark-paid
 * @tested None (needs test)
 */
export async function POST(req: Request, { params }: { params: Promise<{ accountId: string }> }) {
    // Rate limit: 20 writes per minute
    const limited = await rateLimit(req, RATE_LIMITS.write);
    if (limited) {
        return new Response('Too many requests', { status: 429 });
    }

    try {
        const { userId } = await auth();
        const { accountId } = await params;
        if (!userId) {
            return Errors.unauthorized();
        }

        const body = await req.json();

        const result = markPaidSchema.safeParse(body);
        if (!result.success) {
            return NextResponse.json({ error: "Invalid input", details: result.error }, { status: 400 });
        }

        const { amount, date } = result.data;
        const paidDate = date ? new Date(date) : new Date();

        // Verify account exists
        const account = await prisma.plaidAccount.findUnique({
            where: { id: accountId },
            include: { extended: true }
        });

        if (!account) {
            return NextResponse.json({ error: "Account not found" }, { status: 404 });
        }

        // Upsert the extended record with payment info
        const updatedExtended = await prisma.accountExtended.upsert({
            where: { plaidAccountId: accountId },
            create: {
                plaidAccountId: accountId,
                paymentMarkedPaidDate: paidDate,
                paymentMarkedPaidAmount: amount || account.lastStatementBalance || 0,
            },
            update: {
                paymentMarkedPaidDate: paidDate,
                paymentMarkedPaidAmount: amount || account.lastStatementBalance || 0,
            }
        });

        return NextResponse.json({
            success: true,
            data: updatedExtended,
            message: "Payment marked successfully"
        });

    } catch (error) {
        logger.error("Error marking account as paid:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
