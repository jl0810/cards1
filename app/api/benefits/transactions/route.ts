import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, schema, eq, desc } from "@/db";
import { TransactionSchema, safeValidateSchema } from "@/lib/validations";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
    try {
        const session = await auth();
        const user = session?.user;
        if (!user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const benefitId = searchParams.get("benefitId");

        // Validate query parameters using Zod
        const queryValidation = safeValidateSchema(TransactionSchema, { benefitId });
        if (!queryValidation.success) {
            return NextResponse.json({
                error: "Invalid query parameters",
                details: queryValidation.error.issues
            }, { status: 400 });
        }

        if (!benefitId) {
            return NextResponse.json({ error: "benefitId is required" }, { status: 400 });
        }

        // Get all matched transactions for this benefit using Drizzle
        const matchedTransactions = await db.query.transactionExtended.findMany({
            where: eq(schema.transactionExtended.matchedBenefitId, benefitId),
            with: {
                plaidTransaction: true
            }
        });

        // Sort manually since Drizzle query syntax for nested orderBy is slightly different 
        // Or we could join and order. Let's do a simple sort here or join.
        // Joining is better for performance if there are many transactions.

        const transactions = matchedTransactions
            .map(ext => ({
                id: ext.plaidTransaction.id,
                name: ext.plaidTransaction.name,
                amount: ext.plaidTransaction.amount,
                date: ext.plaidTransaction.date,
                merchantName: ext.plaidTransaction.merchantName,
                originalDescription: ext.plaidTransaction.originalDescription
            }))
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        return NextResponse.json({
            success: true,
            data: {
                transactions,
                count: transactions.length
            }
        });
    } catch (error: unknown) {
        console.error("Error fetching benefit transactions:", error);

        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : "Failed to fetch transactions",
            },
            { status: 500 }
        );
    }
}
