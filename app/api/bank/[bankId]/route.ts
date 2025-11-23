import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Errors, successResponse } from '@/lib/api-errors';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: Promise<{ bankId: string }> }) {
    const { bankId } = await params;
    const bank = await prisma.bank.findUnique({
        where: { id: bankId },
        select: { logoUrl: true, brandColor: true, name: true },
    });
    if (!bank) return Errors.notFound('Bank');
    return successResponse(bank);
}
