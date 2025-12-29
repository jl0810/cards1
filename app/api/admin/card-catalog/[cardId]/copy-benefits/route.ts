/**
 * Admin Copy Benefits API
 * Copy benefits from one card to another
 *
 * @module app/api/admin/card-catalog/[cardId]/copy-benefits
 * @implements BR-101 - Admin Catalog Operations
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { requireAdmin } from "@/lib/admin";
import { db, schema, eq, and } from "@/db";
import { Errors } from "@/lib/api-errors";
import { logger } from "@/lib/logger";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ cardId: string }> },
) {
  const limited = await rateLimit(request, RATE_LIMITS.write);
  if (limited) return new Response("Too many requests", { status: 429 });

  try {
    await requireAdmin();
    const { sourceCardId } = await request.json();

    if (!sourceCardId) {
      return NextResponse.json(
        { error: "sourceCardId is required" },
        { status: 400 },
      );
    }

    const { cardId } = await params;

    // Get source card benefits using Drizzle
    const sourceBenefits = await db.query.cardBenefits.findMany({
      where: and(
        eq(schema.cardBenefits.cardProductId, sourceCardId),
        eq(schema.cardBenefits.active, true)
      ),
    });

    if (sourceBenefits.length === 0) {
      return NextResponse.json(
        { error: "No benefits found on source card" },
        { status: 404 },
      );
    }

    // Copy benefits to target card in a transaction
    const results = await db.transaction(async (tx) => {
      const inserted = [];
      for (const benefit of sourceBenefits) {
        const [newBenefit] = await tx.insert(schema.cardBenefits)
          .values({
            cardProductId: cardId,
            benefitName: benefit.benefitName,
            type: benefit.type as any,
            description: benefit.description,
            timing: benefit.timing as any,
            maxAmount: benefit.maxAmount,
            keywords: benefit.keywords,
            isApproved: benefit.isApproved,
            active: benefit.active,
            updatedAt: new Date(),
          })
          .returning();
        inserted.push(newBenefit);
      }
      return inserted;
    });

    return NextResponse.json(
      {
        message: `Copied ${results.length} benefits`,
        count: results.length,
      },
      { status: 200 },
    );
  } catch (error: any) {
    if (error.message === 'Unauthorized') return Errors.unauthorized();
    if (error.message.includes('Forbidden')) return Errors.forbidden();
    logger.error("Error copying benefits", error);
    return Errors.internal();
  }
}
