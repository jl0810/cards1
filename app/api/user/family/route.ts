import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

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

        const familyMembers = await prisma.familyMember.findMany({
            where: { userId: userProfile.id },
            orderBy: { createdAt: 'asc' },
        });

        return NextResponse.json(familyMembers);
    } catch (error) {
        console.error('Error fetching family members:', error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}

export async function POST(req: Request) {
    // Rate limit: 20 creates per minute
    const limited = await rateLimit(req, RATE_LIMITS.write);
    if (limited) {
        return new Response('Too many requests', { status: 429 });
    }

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

        const { name } = await req.json();

        if (!name) {
            return new NextResponse("Name is required", { status: 400 });
        }

        const newMember = await prisma.familyMember.create({
            data: {
                userId: userProfile.id,
                name,
                role: 'Member',
                isPrimary: false,
            },
        });

        return NextResponse.json(newMember);
    } catch (error) {
        console.error('Error creating family member:', error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}
