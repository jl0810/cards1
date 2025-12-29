import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, schema, eq, and, sql, ilike } from "@/db";

// GET /api/card-products - Public endpoint for users to see available cards
export async function GET(req: Request) {
    const session = await auth();
    const user = session?.user;

    if (!user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const bankId = searchParams.get("bankId");
    const issuer = searchParams.get("issuer");

    console.log("🔍 [Card Products API] Query:", { bankId, issuer, userId: user.id });

    let whereClause;
    if (bankId) {
        whereClause = and(eq(schema.cardProducts.active, true), eq(schema.cardProducts.bankId, bankId));
    } else if (issuer) {
        const cleanedIssuer = issuer.replace(/\s+(online|bank|banking|financial)/gi, "").trim();
        whereClause = and(
            eq(schema.cardProducts.active, true),
            ilike(schema.cardProducts.issuer, `%${cleanedIssuer}%`)
        );
    } else {
        whereClause = eq(schema.cardProducts.active, true);
    }

    const products = await db.query.cardProducts.findMany({
        where: whereClause,
        with: {
            benefits: {
                where: eq(schema.cardBenefits.active, true)
            }
        },
        orderBy: [
            schema.cardProducts.issuer,
            schema.cardProducts.productName
        ]
    });

    console.log(`✅ [Card Products API] Found ${products.length} products ${bankId ? `for bankId "${bankId}"` : issuer ? `for issuer "${issuer}"` : "total"}`);

    return NextResponse.json(products);
}
