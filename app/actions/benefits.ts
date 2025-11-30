"use server";

/**
 * Benefits Server Actions
 * Handles benefit matching and usage operations
 *
 * @module app/actions/benefits
 * @implements BR-024 - Cursor-Based Tracking
 * @satisfies US-012 - Manual Benefit Matching
 */

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { scanAndMatchBenefits } from "@/lib/benefit-matcher";
import { logger } from "@/lib/logger";
import * as Sentry from "@sentry/nextjs";

// ============================================================================
// Types
// ============================================================================

type ActionResult<T = unknown> =
  | { success: true; data: T }
  | { success: false; error: string };

interface MatchResult {
  matchedCount: number;
  scannedCount: number;
  newMatches: number;
}

// ============================================================================
// Actions
// ============================================================================

/**
 * Trigger manual benefit matching for all unmatched transactions
 * Uses cursor-based tracking to avoid re-processing
 *
 * @implements BR-024 - Cursor-Based Tracking
 * @satisfies US-012 - Manual Benefit Matching
 */
export async function matchBenefits(): Promise<ActionResult<MatchResult>> {
  // 1. Auth Check
  const { userId } = await auth();
  if (!userId) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    // 2. Execute matching
    const result = await scanAndMatchBenefits(userId);

    // 3. Revalidate affected pages
    revalidatePath("/dashboard");
    revalidatePath("/benefits");

    logger.info("Benefit matching completed", {
      userId,
      matched: result.matched,
      checked: result.checked,
    });

    return {
      success: true,
      data: {
        matchedCount: result.matched,
        scannedCount: result.checked,
        newMatches: result.matched,
      },
    };
  } catch (error) {
    Sentry.captureException(error, {
      user: { id: userId },
      extra: { action: "matchBenefits" },
    });
    logger.error("Error in benefit matching", error, { userId });
    return { success: false, error: "Failed to match benefits" };
  }
}
