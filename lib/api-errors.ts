import { NextResponse } from 'next/server';

/**
 * Standardized API error handling
 * 
 * @module lib/api-errors
 * @implements BR-028 - Standardized Error Responses
 * @satisfies US-016 - Error Handling
 * @tested __tests__/lib/api-errors.test.ts
 */
export class ApiError extends Error {
    constructor(
        public message: string,
        public status: number = 500,
        public code?: string
    ) {
        super(message);
        this.name = 'ApiError';
    }
}

/**
 * Helper to create standardized error responses
 */
export function errorResponse(
    message: string,
    status: number = 500,
    details?: any
) {
    return NextResponse.json(
        {
            error: message,
            status,
            ...(details && { details }),
        },
        { status }
    );
}

/**
 * Helper to create standardized success responses
 */
export function successResponse(data: any, status: number = 200) {
    return NextResponse.json(data, { status });
}

/**
 * Common error responses
 */
export const Errors = {
    unauthorized: (message = 'Unauthorized') => errorResponse(message, 401),
    forbidden: (message = 'Forbidden') => errorResponse(message, 403),
    notFound: (resource = 'Resource') => errorResponse(`${resource} not found`, 404),
    badRequest: (message = 'Bad Request') => errorResponse(message, 400),
    internal: (message = 'Internal Server Error') => errorResponse('Internal Server Error', 500), // Always use generic message for security
};
