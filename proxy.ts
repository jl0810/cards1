import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"

/**
 * Next.js 16 Proxy Boundary
 * 
 * This file replaces middleware.js as the runtime network boundary.
 * It ensures unified protection for all routes in the CGC system.
 */
export default auth((req) => {
    const { nextUrl } = req
    const isLoggedIn = !!req.auth

    // 1. Define Route Classifications
    const isAuthPage = nextUrl.pathname.startsWith("/login") ||
        nextUrl.pathname.startsWith("/signup")

    const isPublicPage = nextUrl.pathname === "/" ||
        nextUrl.pathname.startsWith("/api/auth") ||
        nextUrl.pathname.startsWith("/pricing") ||
        nextUrl.pathname.startsWith("/contact") ||
        nextUrl.pathname.startsWith("/sign-up") // Compatibility

    const isProtectedPage = nextUrl.pathname.startsWith("/dashboard") ||
        nextUrl.pathname.startsWith("/settings") ||
        nextUrl.pathname.startsWith("/projects") ||
        nextUrl.pathname.startsWith("/profile") ||
        nextUrl.pathname.startsWith("/retirement")

    console.log(`[Proxy] ${nextUrl.pathname} | LoggedIn: ${isLoggedIn}`)

    // 2. Logic: Redirect Logged-In users away from Auth Pages
    if (isLoggedIn && isAuthPage) {
        return NextResponse.redirect(new URL("/dashboard", req.url))
    }

    // 3. Logic: Redirect Non-Logged-In users to Login for Protected Pages
    if (!isLoggedIn && isProtectedPage) {
        const loginUrl = new URL("/login", req.url)
        loginUrl.searchParams.set("callbackUrl", nextUrl.pathname)
        return NextResponse.redirect(loginUrl)
    }

    return NextResponse.next()
})

export const config = {
    matcher: [
        /*
         * Catch-all matcher excluding system assets and static media
         */
        "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
    ],
};
