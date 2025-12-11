import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const _isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/webhooks/(.*)",
]);

const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/admin(.*)",
  // Exclude billing routes from protection
  // '/billing(.*)' - excluded to allow UserProfile component
]);

export default clerkMiddleware(async (auth, req) => {
  // Protect dashboard and admin routes
  if (isProtectedRoute(req)) {
    await auth.protect();
  }

  // Add security and cache headers
  const response = NextResponse.next();

  // Only in production
  if (process.env.NODE_ENV === "production") {
    // Security headers
    response.headers.set("X-Content-Type-Options", "nosniff");
    response.headers.set("X-Frame-Options", "DENY");
    response.headers.set("X-XSS-Protection", "1; mode=block");
    response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

    // Cache static assets
    if (req.nextUrl.pathname.startsWith("/_next/static")) {
      response.headers.set(
        "Cache-Control",
        "public, max-age=31536000, immutable",
      );
    }
  }

  return response;
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
