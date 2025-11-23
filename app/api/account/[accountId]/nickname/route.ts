"use server";

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { Errors, successResponse } from '@/lib/api-errors';

export async function PATCH(req: Request, { params }: { params: Promise<{ accountId: string }> }) {
    const { userId } = await auth();
    if (!userId) return Errors.unauthorized();

    const { accountId } = await params;
    const { nickname } = await req.json();
    if (typeof nickname !== 'string') {
        return Errors.badRequest('nickname must be a string');
    }

    try {
        // Find the PlaidAccount first to ensure it belongs to this user
        const account = await prisma.plaidAccount.findUnique({
            where: { accountId: accountId },
            include: { extended: true, plaidItem: { select: { userId: true } } },
        });
        if (!account) return Errors.notFound('Account');
        if (account.plaidItem.userId !== userId) return Errors.forbidden();

        // Upsert the extended record with the new nickname
        await prisma.accountExtended.upsert({
            where: { plaidAccountId: account.id },
            update: { nickname },
            create: {
                plaidAccountId: account.id,
                nickname,
            },
        });

        return successResponse({ success: true });
    } catch (e) {
        console.error(e);
        return Errors.internal(e instanceof Error ? e.message : 'Unknown error');
    }
}
