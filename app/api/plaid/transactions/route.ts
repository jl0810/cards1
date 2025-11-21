import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
    try {
        const { userId } = await auth();

        if (!userId) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const userProfile = await prisma.userProfile.findUnique({
            where: { clerkId: userId },
        });

        if (!userProfile) {
            return new NextResponse("User profile not found", { status: 404 });
        }

        // Fetch transactions for all items belonging to the user
        const transactions = await prisma.plaidTransaction.findMany({
            where: {
                plaidItem: {
                    userId: userProfile.id
                }
            },
            orderBy: {
                date: 'desc'
            },
            take: 50, // Limit to recent 50 transactions
            include: {
                plaidItem: {
                    select: {
                        institutionName: true
                    }
                }
            }
        });

        return NextResponse.json(transactions);
    } catch (error) {
        console.error('Error fetching transactions:', error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}
