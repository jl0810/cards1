import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { webhook_type, webhook_code, item_id } = body;

        logger.info('Received Plaid webhook', { webhook_type, webhook_code, item_id });

        if (webhook_type === 'TRANSACTIONS') {
            if (webhook_code === 'SYNC_UPDATES_AVAILABLE' || webhook_code === 'INITIAL_UPDATE' || webhook_code === 'HISTORICAL_UPDATE' || webhook_code === 'DEFAULT_UPDATE') {
                logger.info('Triggering sync for item', { item_id });

                // Trigger the sync-transactions endpoint
                // We don't need to wait for it
                fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/plaid/sync-transactions`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ itemId: item_id, cursor: null }),
                }).catch(err => logger.error('Failed to trigger sync from webhook', err, { item_id }));
            }
        }

        return new NextResponse("Received", { status: 200 });
    } catch (error) {
        logger.error('Error handling Plaid webhook', error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}
