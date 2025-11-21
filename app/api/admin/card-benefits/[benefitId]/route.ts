import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAdmin } from '@/lib/admin';

// PATCH /api/admin/card-benefits/[benefitId]
export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ benefitId: string }> }
) {
    return withAdmin(async () => {
        const { benefitId } = await params;
        const body = await req.json();
        const { benefitName, timing, maxAmount, keywords, active } = body;

        const benefit = await prisma.cardBenefit.update({
            where: { id: benefitId },
            data: {
                benefitName,
                timing,
                maxAmount: maxAmount !== undefined ? (maxAmount ? parseFloat(maxAmount) : null) : undefined,
                keywords: Array.isArray(keywords) ? keywords : undefined,
                active
            }
        });

        return NextResponse.json(benefit);
    });
}

// DELETE /api/admin/card-benefits/[benefitId]
export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ benefitId: string }> }
) {
    return withAdmin(async () => {
        const { benefitId } = await params;

        await prisma.cardBenefit.delete({
            where: { id: benefitId }
        });

        return NextResponse.json({ success: true });
    });
}
