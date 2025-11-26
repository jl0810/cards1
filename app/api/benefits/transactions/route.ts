import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';

export async function GET(req: Request) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const benefitId = searchParams.get('benefitId');

        if (!benefitId) {
            return NextResponse.json({ error: 'benefitId is required' }, { status: 400 });
        }

        // Get all matched transactions for this benefit
        const matchedTransactions = await prisma.transactionExtended.findMany({
            where: {
                matchedBenefitId: benefitId
            },
            include: {
                plaidTransaction: true
            },
            orderBy: {
                plaidTransaction: {
                    date: 'desc'
                }
            }
        });

        const transactions = matchedTransactions.map(ext => ({
            id: ext.plaidTransaction.id,
            name: ext.plaidTransaction.name,
            amount: ext.plaidTransaction.amount,
            date: ext.plaidTransaction.date,
            merchantName: ext.plaidTransaction.merchantName,
            originalDescription: ext.plaidTransaction.originalDescription
        }));

        return NextResponse.json({
            transactions,
            count: transactions.length
        });
    } catch (error: any) {
        console.error('Error fetching benefit transactions:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to fetch transactions' },
            { status: 500 }
        );
    }
}
