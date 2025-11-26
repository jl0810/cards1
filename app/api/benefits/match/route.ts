/**
 * Benefit Matching API
 * Triggers manual benefit matching for unmatched transactions
 * 
 * @module app/api/benefits/match
 */

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { scanAndMatchBenefits } from '@/lib/benefit-matcher';
import { Errors } from '@/lib/api-errors';
import { logger } from '@/lib/logger';

/**
 * Matches all unmatched transactions to card benefits
 * Uses cursor-based tracking to avoid re-processing
 * 
 * @route POST /api/benefits/match
 * @implements BR-024 - Cursor-Based Tracking
 * @satisfies US-012 - Manual Benefit Matching
 * @tested __tests__/api/benefits/match.test.ts
 * 
 * @returns {Promise<NextResponse>} Match statistics (matched count, scanned count)
 */
export async function POST(req: Request) {
    const { userId } = await auth();

    if (!userId) {
        return Errors.unauthorized();
    }

    try {
        const result = await scanAndMatchBenefits(userId);

        return NextResponse.json({
            success: true,
            ...result
        });

    } catch (error) {
        logger.error('Error in benefit matching', error, { userId });
        return Errors.internal('Failed to match benefits');
    }
}
