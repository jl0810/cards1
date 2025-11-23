import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { fetchInstitutionInfo } from '@/lib/plaid-bank';
import { Errors, successResponse } from '@/lib/api-errors';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    const { userId } = await auth();
    if (!userId) return Errors.unauthorized();

    // TODO: Add admin check here
    // const user = await currentUser();
    // if (user?.publicMetadata?.role !== 'admin') return Errors.forbidden();

    try {
        const { bankId } = await req.json();

        if (!bankId) {
            return Errors.badRequest('bankId is required');
        }

        const bank = await prisma.bank.findUnique({
            where: { id: bankId },
        });

        if (!bank) return Errors.notFound('Bank');

        // Fetch fresh branding from Plaid/Logo.dev
        const info = await fetchInstitutionInfo(bank.plaidId, bank.name);

        // Update the bank record
        const updated = await prisma.bank.update({
            where: { id: bankId },
            data: {
                logoUrl: info.logoUrl || bank.logoUrl,
                brandColor: info.brandColor || bank.brandColor,
            },
        });

        return successResponse({
            message: 'Bank branding refreshed',
            bank: updated,
        });
    } catch (error) {
        console.error('Failed to refresh bank branding:', error);
        return Errors.internal('Failed to refresh bank branding');
    }
}

// Refresh ALL banks
export async function PUT(req: Request) {
    const { userId } = await auth();
    if (!userId) return Errors.unauthorized();

    // TODO: Add admin check here

    try {
        const banks = await prisma.bank.findMany();
        let updated = 0;
        let failed = 0;

        for (const bank of banks) {
            try {
                const info = await fetchInstitutionInfo(bank.plaidId, bank.name);

                if (info.logoUrl || info.brandColor) {
                    await prisma.bank.update({
                        where: { id: bank.id },
                        data: {
                            logoUrl: info.logoUrl || bank.logoUrl,
                            brandColor: info.brandColor || bank.brandColor,
                        },
                    });
                    updated++;
                }
            } catch (e) {
                console.error(`Failed to refresh ${bank.name}:`, e);
                failed++;
            }
        }

        return successResponse({
            message: `Refreshed ${updated} banks, ${failed} failed`,
            updated,
            failed,
        });
    } catch (error) {
        console.error('Failed to refresh all banks:', error);
        return Errors.internal('Failed to refresh all banks');
    }
}
