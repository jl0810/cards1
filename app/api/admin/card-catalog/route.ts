import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAdmin } from '@/lib/admin';

// GET /api/admin/card-catalog
export async function GET(req: Request) {
    return withAdmin(async () => {
        const products = await prisma.cardProduct.findMany({
            include: {
                benefits: true,
                _count: {
                    select: {
                        accountExtensions: true
                    }
                }
            },
            orderBy: [
                { issuer: 'asc' },
                { productName: 'asc' }
            ]
        });

        return NextResponse.json(products);
    });
}

// POST /api/admin/card-products
export async function POST(req: Request) {
    return withAdmin(async () => {
        const body = await req.json();
        const { issuer, productName, cardType, annualFee, signupBonus, imageUrl } = body;

        if (!issuer || !productName) {
            return NextResponse.json(
                { error: 'Issuer and productName are required' },
                { status: 400 }
            );
        }

        const product = await prisma.cardProduct.create({
            data: {
                issuer,
                productName,
                cardType,
                annualFee: annualFee ? parseFloat(annualFee) : null,
                signupBonus,
                imageUrl
            },
            include: {
                benefits: true
            }
        });

        return NextResponse.json(product, { status: 201 });
    });
}
