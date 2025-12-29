/**
 * Benefit Matching API
 * Triggers manual benefit matching for unmatched transactions
 * 
 * @module app/api/benefits/match
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { scanAndMatchBenefits } from "@/lib/benefit-matcher";
import { Errors } from "@/lib/api-errors";
import { logger } from "@/lib/logger";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";

/**
 * Matches all unmatched transactions to card benefits
 * Uses cursor-based tracking to avoid re-processing
 * 
 * @route POST /api/benefits/match
 */
export async function POST(req: Request) {
    const limited = await rateLimit(req, RATE_LIMITS.write);
    if (limited) {
        return new Response("Too many requests", { status: 429 });
    }

    const session = await auth();
    const user = session?.user;
    if (!user?.id) {
        return Errors.unauthorized();
    }

    try {
        const result = await scanAndMatchBenefits(user.id);

        return NextResponse.json({
            success: true,
            ...result
        });

    } catch (error) {
        logger.error("Error in benefit matching", error, { userId: user.id });
        return Errors.internal("Failed to match benefits");
    }
}
