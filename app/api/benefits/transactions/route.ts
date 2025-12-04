import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';
import type { ApiError } from '@/lib/validations';
import { TransactionQuerySchema, safeValidateSchema } from '@/lib/validations';

export async function GET(req: Request) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const benefitId = searchParams.get('benefitId');

        // Validate query parameters using Zod
        const queryValidation = safeValidateSchema(TransactionQuerySchema, { benefitId });
        if (!queryValidation.success) {
            return NextResponse.json({ 
                error: 'Invalid query parameters',
                details: queryValidation.error.issues 
            }, { status: 400 });
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
            success: true,
            data: {
                transactions,
                count: transactions.length
            }
        });
    } catch (error: unknown) {
        console.error('Error fetching benefit transactions:', error);
        
        // Type-safe error handling
        const apiError: ApiError = {
            message: error instanceof Error ? error.message : 'Failed to fetch transactions',
            status: 500
        };
        
        return NextResponse.json(
            { 
                success: false,
                error: apiError.message,
                ...(process.env.NODE_ENV === 'development' && { details: error })
            },
            { status: apiError.status || 500 }
        );
    }
}
