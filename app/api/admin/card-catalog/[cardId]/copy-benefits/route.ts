/**
 * Admin Copy Benefits API
 * Copy benefits from one card to another
 *
 * @module app/api/admin/card-catalog/[cardId]/copy-benefits
 * @implements BR-031 - Admin Role Required
 */

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { Errors } from "@/lib/api-errors";
import { logger } from "@/lib/logger";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ cardId: string }> },
) {
  const limited = await rateLimit(request, RATE_LIMITS.write);
  if (limited) return new Response("Too many requests", { status: 429 });

  const { userId } = await auth();
  if (!userId) return Errors.unauthorized();

  try {
    const { sourceCardId } = await request.json();

    if (!sourceCardId) {
      return NextResponse.json(
        { error: "sourceCardId is required" },
        { status: 400 },
      );
    }

    const { cardId } = await params;

    // Get source card benefits
    const sourceBenefits = await prisma.cardBenefit.findMany({
      where: {
        cardProductId: sourceCardId,
        active: true,
      },
    });

    if (sourceBenefits.length === 0) {
      return NextResponse.json(
        { error: "No benefits found on source card" },
        { status: 404 },
      );
    }

    // Copy benefits to target card
    const createdBenefits = await Promise.all(
      sourceBenefits.map((benefit) =>
        prisma.cardBenefit.create({
          data: {
            cardProductId: cardId,
            benefitName: benefit.benefitName,
            type: benefit.type,
            description: benefit.description,
            timing: benefit.timing,
            maxAmount: benefit.maxAmount,
            keywords: benefit.keywords,
            isApproved: benefit.isApproved,
            active: benefit.active,
          },
        }),
      ),
    );

    return NextResponse.json(
      {
        message: `Copied ${createdBenefits.length} benefits`,
        count: createdBenefits.length,
      },
      { status: 200 },
    );
  } catch (error) {
    logger.error("Error copying benefits", error);
    return Errors.internal();
  }
}
