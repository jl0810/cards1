/**
 * Bank Info API
 * Returns bank branding information for authenticated users
 * 
 * @module app/api/bank/[bankId]
 * @implements BR-026 - Input Validation Required
 * @satisfies US-006 - Link Bank Account (brand display)
 */

import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { Errors, successResponse } from '@/lib/api-errors';

export const dynamic = 'force-dynamic';

/**
 * Get bank branding info
 * 
 * @route GET /api/bank/[bankId]
 * @returns Bank logo, color, and name
 */
export async function GET(req: Request, { params }: { params: Promise<{ bankId: string }> }) {
    // Auth check at top (BR-031)
    const { userId } = await auth();
    if (!userId) {
        return Errors.unauthorized();
    }

    const { bankId } = await params;
    const bank = await prisma.bank.findUnique({
        where: { id: bankId },
        select: { logoUrl: true, logoSvg: true, brandColor: true, name: true },
    });
    if (!bank) return Errors.notFound('Bank');
    return successResponse(bank);
}
