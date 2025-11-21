import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ itemId: string }> }
) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const { familyMemberId } = await req.json();
        if (!familyMemberId) {
            return new NextResponse("Missing familyMemberId", { status: 400 });
        }

        const userProfile = await prisma.userProfile.findUnique({
            where: { clerkId: userId },
        });

        if (!userProfile) {
            return new NextResponse("User profile not found", { status: 404 });
        }

        const { itemId } = await params;

        // Verify the item belongs to the user
        const item = await prisma.plaidItem.findUnique({
            where: { id: itemId },
        });

        if (!item || item.userId !== userProfile.id) {
            return new NextResponse("Item not found or unauthorized", { status: 404 });
        }

        // Verify the family member belongs to the user
        const familyMember = await prisma.familyMember.findUnique({
            where: { id: familyMemberId },
        });

        if (!familyMember || familyMember.userId !== userProfile.id) {
            return new NextResponse("Family member not found or unauthorized", { status: 404 });
        }

        // Update the item and all its accounts
        // We use a transaction to ensure consistency
        const updatedItem = await prisma.$transaction(async (tx) => {
            // Update item
            const updated = await tx.plaidItem.update({
                where: { id: itemId },
                data: { familyMemberId },
            });

            // Update all accounts associated with this item
            await tx.plaidAccount.updateMany({
                where: { plaidItemId: itemId },
                data: { familyMemberId },
            });

            return updated;
        });

        return NextResponse.json(updatedItem);
    } catch (error) {
        console.error('Error updating Plaid item:', error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}
