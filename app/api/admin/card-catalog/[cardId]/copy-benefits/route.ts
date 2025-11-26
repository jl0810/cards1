import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';

export async function POST(
    request: Request,
    { params }: { params: Promise<{ cardId: string }> }
) {
    const { userId } = await auth();
    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { sourceCardId } = await request.json();

        if (!sourceCardId) {
            return NextResponse.json({ error: 'sourceCardId is required' }, { status: 400 });
        }

        const { cardId } = await params;

        // Get source card benefits
        const sourceBenefits = await prisma.cardBenefit.findMany({
            where: {
                cardProductId: sourceCardId,
                active: true
            }
        });

        if (sourceBenefits.length === 0) {
            return NextResponse.json({ error: 'No benefits found on source card' }, { status: 404 });
        }

        // Copy benefits to target card
        const createdBenefits = await Promise.all(
            sourceBenefits.map(benefit =>
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
                        active: benefit.active
                    }
                })
            )
        );

        return NextResponse.json({
            message: `Copied ${createdBenefits.length} benefits`,
            count: createdBenefits.length
        }, { status: 200 });

    } catch (error) {
        console.error('Error copying benefits:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
