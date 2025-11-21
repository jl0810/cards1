import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// Disconnect a Plaid item (mark as disconnected, but preserve access_token per Plaid requirement)
export async function POST(
    req: Request,
    { params }: { params: Promise<{ itemId: string }> }
) {
    try {
        const { itemId } = await params;
        const { userId } = await auth();
        if (!userId) return new NextResponse("Unauthorized", { status: 401 });

        const userProfile = await prisma.userProfile.findUnique({
            where: { clerkId: userId },
        });
        if (!userProfile) return new NextResponse("User not found", { status: 404 });

        // Verify ownership
        const plaidItem = await prisma.plaidItem.findFirst({
            where: {
                id: itemId,
                userId: userProfile.id
            }
        });

        if (!plaidItem) return new NextResponse("Item not found", { status: 404 });

        // Update status to disconnected
        // IMPORTANT: We do NOT delete the access_token from Vault per Plaid's requirement
        await prisma.plaidItem.update({
            where: { id: itemId },
            data: {
                status: 'disconnected'
            }
        });

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('Error disconnecting item:', error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}
