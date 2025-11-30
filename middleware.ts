import { NextResponse } from 'next/server';
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

/**
 * Security middleware
 * 
 * @implements BR-042 - XSS Prevention
 * @implements BR-043 - CSRF Protection
 * @implements BR-044 - Security Headers
 */

// Define public routes that don't require authentication
const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhooks(.*)', // Webhooks need public access
]);

export default clerkMiddleware(async (auth, req) => {
  // Protect non-public routes - Clerk will handle redirects
  if (!isPublicRoute(req)) {
    const session = await auth();
    if (!session.userId) {
      return new Response('Unauthorized', { status: 401 });
    }
  }

  const response = NextResponse.next();

  // Add security headers to all responses
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Content Security Policy
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Required for Next.js development
    "style-src 'self' 'unsafe-inline'", // Required for Tailwind CSS
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "connect-src 'self' https: ws:", // WebSockets for development
    "media-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests"
  ].join('; ');
  
  response.headers.set('Content-Security-Policy', csp);

  return response;
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
