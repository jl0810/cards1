import { auth } from "@/lib/auth";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Next.js Middleware - Unified Security Boundary
 * 
 * This middleware acts as the "bouncer" for the application.
 * It strictly enforces access control for protected routes.
 * 
 * Behavior:
 * 1. If user is NOT logged in and tries to access /dashboard, /settings, etc. -> Redirect to /login
 * 2. If user IS logged in and tries to access /login or /signup -> Redirect to /dashboard
 * 3. Otherwise -> Allow request to proceed
 */
export default auth((req: NextRequest & { auth?: unknown }) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;

  // 1. Define Route Classifications
  const isAuthPage =
    nextUrl.pathname.startsWith("/login") ||
    nextUrl.pathname.startsWith("/signup");

  const isProtectedPage =
    nextUrl.pathname.startsWith("/dashboard") ||
    nextUrl.pathname.startsWith("/settings") ||
    nextUrl.pathname.startsWith("/projects") ||
    nextUrl.pathname.startsWith("/profile") ||
    nextUrl.pathname.startsWith("/retirement") ||
    nextUrl.pathname.startsWith("/admin");

  // 2. Logic: Redirect Logged-In users away from Auth Pages (prevent login while logged in)
  if (isLoggedIn && isAuthPage) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // 3. Logic: Redirect Non-Logged-In users to Login for Protected Pages
  if (!isLoggedIn && isProtectedPage) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 4. Default: Allow
  return NextResponse.next();
});

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - api routes (they have their own protection logic)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
