/**
 * Admin Alerts API
 * Send system alerts to users via Novu
 * 
 * @module app/api/admin/alerts
 * @implements BR-031 - Admin Role Required
 * @satisfies US-023 - Admin Notifications
 */

import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { Novu } from '@novu/node';
import { requireAdmin } from '@/lib/admin';
import { Errors } from '@/lib/api-errors';
import { logger } from '@/lib/logger';
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit';

const novu = new Novu(process.env.NOVU_API_KEY!);

const AlertSchema = z.object({
    title: z.string().min(1).max(200),
    message: z.string().min(1).max(2000),
    type: z.enum(['info', 'warning', 'error', 'success']).default('info'),
    priority: z.enum(['low', 'medium', 'high']).default('medium'),
    targetUserId: z.string().optional(),
    actionUrl: z.string().url().optional(),
    actionText: z.string().max(50).optional(),
});

/**
 * Send an admin alert
 * @route POST /api/admin/alerts
 */
export async function POST(request: NextRequest) {
  const limited = await rateLimit(request, RATE_LIMITS.write);
  if (limited) {
    return new Response('Too many requests', { status: 429 });
  }

  try {
    const admin = await requireAdmin();
    
    const body = await request.json();
    const validation = AlertSchema.safeParse(body);
    if (!validation.success) {
      return Errors.badRequest('Invalid alert data');
    }

    const { title, message, type, priority, targetUserId, actionUrl, actionText } = validation.data;

    // Create the notification trigger
    const result = await novu.trigger('admin-alert', {
      to: targetUserId ? { subscriberId: targetUserId } : 'all-subscribers',
      payload: {
        title,
        message,
        type,
        priority,
        actionUrl,
        actionText,
        sentBy: admin.userId,
        sentAt: new Date().toISOString()
      }
    });

    return NextResponse.json({ 
      success: true, 
      notificationId: result.data?.notificationId,
      message: 'Alert sent successfully'
    });

  } catch (error) {
    logger.error('Error sending admin alert:', error);
    return Errors.internal();
  }
}

/**
 * Get alert history
 * @route GET /api/admin/alerts
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    // Fetch recent alerts (for admin dashboard)
    // This is a placeholder - you'd implement actual alert history
    return NextResponse.json({
      alerts: [],
      message: 'Alert history feature coming soon'
    });

  } catch (error) {
    logger.error('Error fetching alerts:', error);
    return Errors.internal();
  }
}
