import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// Check if a family member can be deleted
export async function GET(
    req: Request,
    { params }: { params: Promise<{ memberId: string }> }
) {
    try {
        const { memberId } = await params;
        const { userId } = await auth();
        if (!userId) return new NextResponse("Unauthorized", { status: 401 });

        const userProfile = await prisma.userProfile.findUnique({
            where: { clerkId: userId },
        });
        if (!userProfile) return new NextResponse("User not found", { status: 404 });

        // Verify ownership
        const member = await prisma.familyMember.findFirst({
            where: {
                id: memberId,
                userId: userProfile.id
            },
            include: {
                _count: {
                    select: { plaidItems: true }
                }
            }
        });

        if (!member) return new NextResponse("Family member not found", { status: 404 });

        // PROTECTION 1: Cannot delete Primary member
        if (member.isPrimary) {
            return new NextResponse("Cannot delete the primary family member.", { status: 400 });
        }

        // PROTECTION 2: Cannot delete member with linked items
        if (member._count.plaidItems > 0) {
            return new NextResponse(
                `Cannot delete ${member.name} because they have ${member._count.plaidItems} active bank connection(s). Please reassign or remove the bank connections first.`,
                { status: 400 }
            );
        }

        // All checks passed
        return new NextResponse("OK", { status: 200 });

    } catch (error) {
        console.error('Error checking delete eligibility:', error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}
