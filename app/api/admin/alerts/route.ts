/**
 * Admin Alerts API
 * No-op version (Novu removed)
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin";
import { Errors } from "@/lib/api-errors";
import { logger } from "@/lib/logger";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";

const AlertSchema = z.object({
  title: z.string().min(1).max(200),
  message: z.string().min(1).max(2000),
  type: z.enum(["info", "warning", "error", "success"]).default("info"),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  targetUserId: z.string().optional(),
  actionUrl: z.string().url().optional(),
  actionText: z.string().max(50).optional(),
});

/**
 * Send an admin alert (DUMMY)
 * @route POST /api/admin/alerts
 */
export async function POST(request: NextRequest) {
  const limited = await rateLimit(request, RATE_LIMITS.write);
  if (limited) {
    return new Response("Too many requests", { status: 429 });
  }

  try {
    await requireAdmin();
    const body = await request.json();
    const validation = AlertSchema.safeParse(body);
    if (!validation.success) {
      return Errors.badRequest("Invalid alert data");
    }

    logger.info("Admin alert received (NOT SENT - Novu disabled):", validation.data);

    return NextResponse.json({
      success: true,
      message: "Alert logged successfully (Notifications disabled)",
    });
  } catch (error) {
    logger.error("Error in admin alert (dummy):", error);
    return Errors.internal();
  }
}

/**
 * Get alert history
 * @route GET /api/admin/alerts
 */
export async function GET(_request: NextRequest) {
  try {
    await requireAdmin();
    return NextResponse.json({
      alerts: [],
      message: "Alert history coming soon",
    });
  } catch (error) {
    logger.error("Error fetching alerts:", error);
    return Errors.internal();
  }
}
