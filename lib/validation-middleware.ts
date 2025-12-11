/**
 * API Validation Middleware
 * Provides reusable validation functions for API routes
 *
 * @module lib/validation-middleware
 * @implements BR-026 - Input Validation Required
 * @implements BR-027 - Data Sanitization
 * @satisfies US-015 - Input Validation
 * @tested __tests__/lib/validation-middleware.test.ts
 */

import type { NextRequest, NextResponse } from "next/server";
import type { ZodSchema } from "zod";
import { z } from "zod";
import { Errors } from "./api-errors";

/**
 * Validate request body against a Zod schema
 *
 * @param schema - Zod schema to validate against
 * @param request - Next.js request object
 * @returns Validated data or error response
 *
 * @example
 * ```typescript
 * import { validateBody } from '@/lib/validation-middleware';
 * import { CreateFamilyMemberSchema } from '@/lib/validations';
 *
 * export async function POST(req: NextRequest) {
 *   const body = await validateBody(CreateFamilyMemberSchema, req);
 *   if (!body.success) {
 *     return body.error;
 *   }
 *   // Use body.data
 * }
 * ```
 */
export async function validateBody<T>(
  schema: ZodSchema<T>,
  request: NextRequest,
): Promise<
  { success: true; data: T } | { success: false; error: NextResponse }
> {
  try {
    const body = await request.json();
    const result = schema.safeParse(body);

    if (!result.success) {
      return {
        success: false,
        error: Errors.badRequest(
          result.error.issues[0]?.message || "Invalid input data",
        ),
      };
    }

    return { success: true, data: result.data };
  } catch (_error) {
    return {
      success: false,
      error: Errors.badRequest("Invalid JSON format"),
    };
  }
}

/**
 * Validate query parameters against a Zod schema
 *
 * @param schema - Zod schema to validate against
 * @param request - Next.js request object
 * @returns Validated data or error response
 */
export function validateQuery<T>(
  schema: ZodSchema<T>,
  request: NextRequest,
): { success: true; data: T } | { success: false; error: NextResponse } {
  try {
    const { searchParams } = new URL(request.url);
    const queryObject: Record<string, string> = {};

    // Convert URLSearchParams to plain object
    for (const [key, value] of searchParams.entries()) {
      queryObject[key] = value;
    }

    const result = schema.safeParse(queryObject);

    if (!result.success) {
      return {
        success: false,
        error: Errors.badRequest(
          result.error.issues[0]?.message || "Invalid query parameters",
        ),
      };
    }

    return { success: true, data: result.data };
  } catch (_error) {
    return {
      success: false,
      error: Errors.badRequest("Invalid query parameters"),
    };
  }
}

/**
 * Validate route parameters against a Zod schema
 *
 * @param schema - Zod schema to validate against
 * @param params - Route parameters object
 * @returns Validated data or error response
 */
export function validateParams<T>(
  schema: ZodSchema<T>,
  params: Record<string, string | undefined>,
): { success: true; data: T } | { success: false; error: NextResponse } {
  const result = schema.safeParse(params);

  if (!result.success) {
    return {
      success: false,
      error: Errors.badRequest(
        result.error.issues[0]?.message || "Invalid route parameters",
      ),
    };
  }

  return { success: true, data: result.data };
}

/**
 * Common validation schemas for API patterns
 */
export const CommonSchemas = {
  /**
   * UUID validation schema
   */
  uuid: z.string().uuid("Invalid ID format"),

  /**
   * Pagination schema
   */
  pagination: z.object({
    page: z.string().regex(/^\d+$/).transform(Number).default(1),
    limit: z.string().regex(/^\d+$/).transform(Number).default(10),
  }),

  /**
   * Date range schema
   */
  dateRange: z.object({
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
  }),

  /**
   * Sort schema
   */
  sort: z.object({
    sortBy: z.string().optional(),
    sortOrder: z.enum(["asc", "desc"]).default("desc"),
  }),
};

/**
 * Helper function to create object schemas for route parameters
 */
export function createParamsSchema<T extends Record<string, z.ZodSchema>>(
  shape: T,
): z.ZodObject<T> {
  return z.object(shape);
}

/**
 * Higher-order function that adds validation to API handlers
 *
 * @param schema - Zod schema to validate against
 * @param handler - API handler function that receives validated data
 * @returns Wrapped API handler with validation
 *
 * @example
 * ```typescript
 * import { withValidation } from '@/lib/validation-middleware';
 * import { CreateFamilyMemberSchema } from '@/lib/validations';
 *
 * export const POST = withValidation(CreateFamilyMemberSchema, async (req, { data }) => {
 *   // data is already validated and typed
 *   const { name, email } = data;
 *   // ... handler logic
 * });
 * ```
 */
export function withValidation<T>(
  schema: ZodSchema<T>,
  handler: (
    request: NextRequest,
    context: { data: T; params?: Record<string, string> },
  ) => Promise<NextResponse>,
) {
  return async (
    request: NextRequest,
    context?: { params?: Record<string, string> },
  ) => {
    const validation = await validateBody(schema, request);

    if (!validation.success) {
      return validation.error;
    }

    return handler(request, { data: validation.data, params: context?.params });
  };
}

/**
 * Validate authentication before processing request
 *
 * @param request - Next.js request object
 * @param userId - User ID from authentication
 * @returns Error response if unauthorized, null if authorized
 */
export function validateAuth(userId: string | null): NextResponse | null {
  if (!userId) {
    return Errors.unauthorized();
  }
  return null;
}
