import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ cardId: string }> }
) {
    try {
        await requireAdmin();
        const { cardId } = await params;

        const card = await prisma.cardProduct.findUnique({
            where: { id: cardId },
            include: {
                benefits: {
                    orderBy: { benefitName: 'asc' }
                }
            }
        });

        if (!card) {
            return NextResponse.json({ error: 'Card not found' }, { status: 404 });
        }

        return NextResponse.json(card);
    } catch (error) {
        console.error('Error fetching card:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ cardId: string }> }
) {
    try {
        await requireAdmin();
        const { cardId } = await params;
        const data = await request.json();

        // Update Card Product
        const updatedCard = await prisma.cardProduct.update({
            where: { id: cardId },
            data: {
                productName: data.productName,
                issuer: data.issuer,
                cardType: data.cardType,
                annualFee: data.annualFee,
                signupBonus: data.signupBonus,
                imageUrl: data.imageUrl,
                active: data.active
            }
        });

        // Handle Benefits Update (Full Sync for simplicity in this edit mode)
        // 1. Delete existing benefits (or we could be smarter and update by ID)
        // For now, we'll assume the UI sends the "complete" list of desired benefits.

        if (data.benefits && Array.isArray(data.benefits)) {
            // Transaction to ensure consistency
            await prisma.$transaction(async (tx) => {
                // Delete all existing benefits
                await tx.cardBenefit.deleteMany({
                    where: { cardProductId: cardId }
                });

                // Create new ones
                if (data.benefits.length > 0) {
                    await tx.cardBenefit.createMany({
                        data: data.benefits.map((b: any) => ({
                            cardProductId: cardId,
                            benefitName: b.benefitName,
                            type: b.type || 'STATEMENT_CREDIT',
                            description: b.description,
                            timing: b.timing || 'Annually',
                            maxAmount: b.maxAmount,
                            keywords: b.keywords || []
                        }))
                    });
                }
            });
        }

        return NextResponse.json({ success: true, card: updatedCard });

    } catch (error) {
        console.error('Error updating card:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
