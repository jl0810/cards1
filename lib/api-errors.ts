import { NextResponse } from 'next/server';

/**
 * Standard API Error class for consistent error handling
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
    unauthorized: () => errorResponse('Unauthorized', 401),
    forbidden: () => errorResponse('Forbidden', 403),
    notFound: (resource = 'Resource') => errorResponse(`${resource} not found`, 404),
    badRequest: (message = 'Bad Request') => errorResponse(message, 400),
    internal: (message = 'Internal Server Error') => errorResponse(message, 500),
};
