/**
 * Admin Bank Refresh API
 * Refresh bank branding from Plaid/Logo.dev
 *
 * @module app/api/admin/banks/refresh
 * @implements BR-100 - Institution Metadata
 */

import { requireAdmin } from "@/lib/admin";
import { db, schema, eq } from "@/db";
import { fetchInstitutionInfo } from "@/lib/plaid-bank";
import { Errors, successResponse } from "@/lib/api-errors";
import { logger } from "@/lib/logger";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/**
 * Refresh a single bank
 */
export async function POST(req: Request) {
  const limited = await rateLimit(req, RATE_LIMITS.write);
  if (limited) return new Response("Too many requests", { status: 429 });

  try {
    const adminUser = await requireAdmin();
    // userInfo contains userId, role, isAdmin if we need them
    const { bankId } = await req.json();

    if (!bankId) {
      return Errors.badRequest("bankId is required");
    }

    const bank = await db.query.banks.findFirst({
      where: eq(schema.banks.id, bankId),
    });

    if (!bank) return Errors.notFound("Bank");

    // Fetch fresh branding from Plaid/Logo.dev
    const info = await fetchInstitutionInfo(bank.plaidId, bank.name);

    // Update the bank record using Drizzle
    const [updated] = await db.update(schema.banks)
      .set({
        logoUrl: info.logoUrl || bank.logoUrl,
        brandColor: info.brandColor || bank.brandColor,
        updatedAt: new Date(),
      })
      .where(eq(schema.banks.id, bankId))
      .returning();

    return successResponse({
      message: "Bank branding refreshed",
      bank: updated,
    });
  } catch (error: any) {
    if (error.message === 'Unauthorized') return Errors.unauthorized();
    if (error.message.includes('Forbidden')) return Errors.forbidden();
    logger.error("Failed to refresh bank branding:", error);
    return Errors.internal("Failed to refresh bank branding");
  }
}

/**
 * Refresh ALL banks
 */
export async function PUT(req: Request) {
  const limited = await rateLimit(req, RATE_LIMITS.sensitive);
  if (limited) return new Response("Too many requests", { status: 429 });

  try {
    const adminUser = await requireAdmin();
    const banks = await db.query.banks.findMany();
    let updatedCount = 0;
    let failedCount = 0;

    for (const bank of banks) {
      try {
        const info = await fetchInstitutionInfo(bank.plaidId, bank.name);

        if (info.logoUrl || info.brandColor) {
          await db.update(schema.banks)
            .set({
              logoUrl: info.logoUrl || bank.logoUrl,
              brandColor: info.brandColor || bank.brandColor,
              updatedAt: new Date(),
            })
            .where(eq(schema.banks.id, bank.id));
          updatedCount++;
        }
      } catch (e) {
        logger.warn(`Failed to refresh bank ${bank.name}`, { error: e });
        failedCount++;
      }
    }

    return successResponse({
      message: `Refreshed ${updatedCount} banks, ${failedCount} failed`,
      updated: updatedCount,
      failed: failedCount,
    });
  } catch (error: any) {
    if (error.message === 'Unauthorized') return Errors.unauthorized();
    if (error.message.includes('Forbidden')) return Errors.forbidden();
    logger.error("Failed to refresh all banks:", error);
    return Errors.internal("Failed to refresh all banks");
  }
}
