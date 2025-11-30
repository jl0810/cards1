/**
 * Cron Job: Sync Clerk users to database
 * Runs daily to catch any missed webhooks
 * 
 * @module app/api/cron/sync-clerk
 * @implements BR-001A - Clerk Sync (Self-Healing)
 * @tested Manual verification
 * 
 * Vercel Cron Configuration (vercel.json):
 * {
 *   "crons": [{
 *     "path": "/api/cron/sync-clerk",
 *     "schedule": "0 2 * * *"
 *   }]
 * }
 */

import { NextResponse } from 'next/server';
import { syncAllClerkUsers } from '@/lib/clerk-sync';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 seconds for cron jobs

/**
 * Cron endpoint to sync all Clerk users
 * Protected by Vercel Cron Secret
 * 
 * @route GET /api/cron/sync-clerk
 * @implements BR-001A - Clerk Sync
 */
export async function GET(req: Request) {
  try {
    // Verify cron secret (Vercel automatically adds this header)
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    // SECURITY: Reject if secret is missing OR doesn't match
    // This prevents bypass when CRON_SECRET env var is unset
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      logger.warn('Unauthorized cron request', {
        hasAuth: !!authHeader,
        hasCronSecret: !!cronSecret,
      });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    logger.info('Starting scheduled Clerk sync');

    const results = await syncAllClerkUsers();

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    logger.info('Scheduled Clerk sync complete', {
      total: results.length,
      successful,
      failed,
    });

    return NextResponse.json({
      success: true,
      total: results.length,
      successful,
      failed,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Cron sync failed', error);
    return NextResponse.json(
      {
        error: 'Sync failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
