import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';

// GET /api/card-products - Public endpoint for users to see available cards
export async function GET(req: Request) {
    const { userId } = await auth();

    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const issuer = searchParams.get('issuer');

    const products = await prisma.cardProduct.findMany({
        where: {
            active: true,
            ...(issuer ? { issuer: { contains: issuer, mode: 'insensitive' } } : {})
        },
        include: {
            benefits: {
                where: { active: true }
            }
        },
        orderBy: [
            { issuer: 'asc' },
            { productName: 'asc' }
        ]
    });

    return NextResponse.json(products);
}
