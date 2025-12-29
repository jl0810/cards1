/**
 * Bank Info API
 * Returns bank branding information for authenticated users
 * 
 * @module app/api/bank/[bankId]
 * @implements BR-100 - Institution Metadata
 */

import { auth } from "@/lib/auth";
import { db, schema, eq } from "@/db";
import { Errors, successResponse } from "@/lib/api-errors";
import { z } from "zod";

export const dynamic = "force-dynamic";

/**
 * Get bank branding info
 * 
 * @route GET /api/bank/[bankId]
 */
export async function GET(req: Request, { params }: { params: Promise<{ bankId: string }> }) {
    const session = await auth();
    const user = session?.user;
    if (!user?.id) {
        return Errors.unauthorized();
    }

    const { bankId } = await params;

    // Simple ID validation
    if (!bankId || bankId.length < 5) {
        return Errors.badRequest("Invalid bank ID");
    }

    const bank = await db.query.banks.findFirst({
        where: eq(schema.banks.id, bankId),
        columns: {
            logoUrl: true,
            brandColor: true,
            name: true,
        }
    });

    if (!bank) return Errors.notFound("Bank");
    return successResponse(bank);
}
