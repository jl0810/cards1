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
    const bankId = searchParams.get('bankId');
    const issuer = searchParams.get('issuer'); // Fallback for when bankId not available

    console.log('🔍 [Card Products API] Query:', { bankId, issuer, userId });

    const products = await prisma.cardProduct.findMany({
        where: {
            active: true,
            ...(bankId
                ? { bankId } // Prefer exact FK match
                : issuer
                    ? { issuer: { contains: issuer.replace(/\s+(online|bank|banking|financial)/gi, '').trim(), mode: 'insensitive' } }
                    : {}
            )
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

    console.log(`✅ [Card Products API] Found ${products.length} products ${bankId ? `for bankId "${bankId}"` : issuer ? `for issuer "${issuer}"` : 'total'}`);
    if (products.length > 0) {
        console.log('   Products:', products.map(p => `${p.issuer} - ${p.productName}`).join(', '));
    }

    return NextResponse.json(products);
}
