import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';

// PATCH /api/plaid/accounts/[accountId]/link-product
export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ accountId: string }> }
) {
    const { userId } = await auth();

    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { accountId } = await params;
    const body = await req.json();
    const { cardProductId } = body;

    // Verify user owns this account
    const userProfile = await prisma.userProfile.findUnique({
        where: { clerkId: userId }
    });

    if (!userProfile) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Verify account belongs to user
    const account = await prisma.plaidAccount.findFirst({
        where: {
            id: accountId,
            plaidItem: {
                userId: userProfile.id
            }
        }
    });

    if (!account) {
        return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    // Upsert AccountExtended
    const extended = await prisma.accountExtended.upsert({
        where: { plaidAccountId: account.id },
        create: {
            plaidAccountId: account.id,
            cardProductId: cardProductId || null
        },
        update: {
            cardProductId: cardProductId || null
        },
        include: {
            cardProduct: {
                include: {
                    benefits: true
                }
            }
        }
    });

    return NextResponse.json(extended);
}
