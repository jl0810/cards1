import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { Errors } from "@/lib/api-errors";

const markPaidSchema = z.object({
    amount: z.number().optional(),
    date: z.string().datetime().optional(), // ISO date string
});

export async function POST(req: Request, { params }: { params: { accountId: string } }) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return Errors.unauthorized();
        }

        const { accountId } = params;
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
        console.error("Error marking account as paid:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
