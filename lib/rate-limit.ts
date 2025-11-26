/**
 * Rate Limiting Utility using Upstash Redis
 * 
 * This module provides rate limiting functionality for API routes to prevent abuse.
 * It uses a sliding window algorithm with per-user limits.
 * 
 * @module lib/rate-limit
 * @implements BR-030 - API Rate Limits
 * @satisfies US-018 - API Rate Limiting
 * @tested None (needs tests)
 * 
 * @example Basic usage in API route
 * ```typescript
 * import { rateLimit } from '@/lib/rate-limit';
 * 
 * export async function POST(req: Request) {
 *   const limited = await rateLimit(req);
 *   if (limited) {
 *     return new Response('Too many requests', { status: 429 });
 *   }
 *   // ... rest of handler
 * }
 * ```
 * 
 * @example Custom limits
 * ```typescript
 * const limited = await rateLimit(req, {
 *   max: 5,
 *   window: '1 m',
 *   prefix: 'api:sensitive'
 * });
 * ```
 */

import { Ratelimit, type Duration } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { auth } from '@clerk/nextjs/server';

/**
 * Rate limit configuration options
 */
export interface RateLimitOptions {
    /** Maximum number of requests allowed in the window */
    max?: number;
    /** Time window for rate limiting (e.g., '1 m', '1 h', '1 d') */
    window?: string;
    /** Prefix for Redis keys (helps organize different rate limits) */
    prefix?: string;
}

/**
 * Default rate limits for different API endpoints
 */
export const RATE_LIMITS = {
    /** Standard API routes: 60 requests per minute */
    default: { max: 60, window: '1 m' },
    /** Authentication routes: 10 requests per minute */
    auth: { max: 10, window: '1 m' },
    /** Write operations: 20 requests per minute */
    write: { max: 20, window: '1 m' },
    /** Sensitive operations (e.g., delete): 5 requests per minute */
    sensitive: { max: 5, window: '1 m' },
    /** Plaid sync operations: 100 requests per hour */
    plaidSync: { max: 100, window: '1 h' },
} as const;

// Initialize Redis client (only if Upstash credentials are available)
let redis: Redis | null = null;
let rateLimiter: Ratelimit | null = null;

if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });

    // Create a default rate limiter
    rateLimiter = new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(60, '1 m'),
        analytics: true,
        prefix: '@upstash/ratelimit',
    });
}

/**
 * Apply rate limiting to an API request
 * 
 * @param req - The incoming request object
 * @param options - Rate limit configuration options
 * @returns True if rate limit exceeded, false otherwise
 * 
 * @example
 * ```typescript
 * const limited = await rateLimit(req, { max: 10, window: '1 m' });
 * if (limited) {
 *   return new Response('Rate limit exceeded', { status: 429 });
 * }
 * ```
 */
export async function rateLimit(
    req: Request,
    options: RateLimitOptions = RATE_LIMITS.default
): Promise<boolean> {
    // If Redis is not configured, skip rate limiting (development mode)
    if (!redis || !rateLimiter) {
        console.warn('Rate limiting disabled: Upstash Redis not configured');
        return false;
    }

    try {
        // Get user ID for per-user rate limiting
        const { userId } = await auth();
        const identifier = userId || getIPAddress(req);

        // Create rate limiter with custom options if provided
        const limiter = options.max && options.window
            ? new Ratelimit({
                redis,
                limiter: Ratelimit.slidingWindow(options.max, options.window as Duration),
                analytics: true,
                prefix: options.prefix || '@upstash/ratelimit',
            })
            : rateLimiter;

        // Check rate limit
        const { success, limit, reset, remaining } = await limiter.limit(identifier);

        // Log for debugging  (can be removed in production)
        if (!success) {
            console.warn(`Rate limit exceeded for ${identifier}. Limit: ${limit}, Remaining: ${remaining}, Reset: ${new Date(reset)}`);
        }

        return !success;
    } catch (error) {
        console.error('Rate limit error:', error);
        // Fail open: don't block requests if rate limiting fails
        return false;
    }
}

/**
 * Get IP address from request headers
 * Used as fallback identifier when user is not authenticated
 * 
 * @param req - The incoming request
 * @returns IP address or 'unknown'
 */
function getIPAddress(req: Request): string {
    // Try various headers that might contain the client IP
    const forwarded = req.headers.get('x-forwarded-for');
    const real = req.headers.get('x-real-ip');
    const cf = req.headers.get('cf-connecting-ip');

    if (forwarded) return forwarded.split(',')[0].trim();
    if (real) return real;
    if (cf) return cf;

    return 'unknown';
}

/**
 * Middleware wrapper for rate limiting
 * Use this to wrap your API route handlers
 * 
 * @param handler - The API route handler function
 * @param options - Rate limit configuration
 * @returns Wrapped handler with rate limiting
 * 
 * @example
 * ```typescript
 * export const POST = withRateLimit(
 *   async (req: Request) => {
 *     // Your handler code
 *     return NextResponse.json({ success: true });
 *   },
 *   { max: 10, window: '1 m' }
 * );
 * ```
 */
export function withRateLimit(
    handler: (req: Request) => Promise<Response>,
    options?: RateLimitOptions
) {
    return async (req: Request) => {
        const limited = await rateLimit(req, options);

        if (limited) {
            return new Response(
                JSON.stringify({
                    error: 'Too many requests',
                    message: 'Please slow down and try again later'
                }),
                {
                    status: 429,
                    headers: {
                        'Content-Type': 'application/json',
                        'Retry-After': '60', // Suggest retry after 60 seconds
                    },
                }
            );
        }

        return handler(req);
    };
}
