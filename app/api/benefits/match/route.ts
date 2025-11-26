import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { scanAndMatchBenefits } from '@/lib/benefit-matcher';

/**
 * Matches all unmatched transactions to card benefits
 * Uses cursor-based tracking to avoid re-processing
 */
export async function POST(req: Request) {
    const { userId } = await auth();

    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const result = await scanAndMatchBenefits(userId);

        return NextResponse.json({
            success: true,
            ...result
        });

    } catch (error) {
        console.error('Error in benefit matching:', error);
        return NextResponse.json(
            { error: 'Failed to match benefits' },
            { status: 500 }
        );
    }
}
