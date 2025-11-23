import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin';

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ benefitId: string }> }
) {
    try {
        await requireAdmin();
        const { benefitId } = await params;
        const data = await request.json();

        // Update individual benefit
        const updatedBenefit = await prisma.cardBenefit.update({
            where: { id: benefitId },
            data: {
                benefitName: data.benefitName,
                type: data.type,
                description: data.description,
                timing: data.timing,
                maxAmount: data.maxAmount,
                keywords: data.keywords,
                isApproved: data.isApproved // Explicitly set approval status
            }
        });

        return NextResponse.json({ success: true, benefit: updatedBenefit });

    } catch (error) {
        console.error('Error updating benefit:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ benefitId: string }> }
) {
    try {
        await requireAdmin();
        const { benefitId } = await params;

        await prisma.cardBenefit.delete({
            where: { id: benefitId }
        });

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('Error deleting benefit:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
