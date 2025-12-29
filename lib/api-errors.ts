import { NextResponse } from "next/server";

/**
 * Standardized API error handling
 *
 * @module lib/api-errors
 * @implements BR-028 - Standardized Error Responses
 * @satisfies US-016 - Error Handling
 * @tested __tests__/lib/api-errors.test.ts
 */

type SuccessResponse<T> = {
  success: true;
  data: T;
};

export class ApiError extends Error {
  constructor(
    public message: string,
    public status: number = 500,
    public code?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * Helper to create standardized error responses
 */
export function errorResponse(
  message: string,
  status: number = 500,
  details?: unknown,
) {
  return NextResponse.json(
    {
      success: false,
      error: message,
      status,
      ...(details !== undefined && { details }),
    },
    { status },
  );
}

/**
 * Helper to create standardized success responses
 */
export function successResponse<T>(data: T, status: number = 200) {
  const response: SuccessResponse<T> = {
    success: true,
    data,
  };
  return NextResponse.json(response, { status });
}

/**
 * Common error responses
 */
export const Errors = {
  unauthorized: (_message = "Unauthorized") => errorResponse(_message, 401),
  forbidden: (_message = "Forbidden") => errorResponse(_message, 403),
  notFound: (resource = "Resource") =>
    errorResponse(`${resource} not found`, 404),
  badRequest: (_message = "Bad Request") => errorResponse(_message, 400),
  internal: (_message = "Internal Server Error") =>
    errorResponse("Internal Server Error", 500),
};
