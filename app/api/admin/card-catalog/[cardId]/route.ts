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

        // Update Card Product Only (not benefits)
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

        // Note: Benefits are NOT updated here - they should be managed individually
        // This prevents accidentally approving draft benefits when saving card details

        return NextResponse.json({ success: true, card: updatedCard });

    } catch (error) {
        console.error('Error updating card:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
