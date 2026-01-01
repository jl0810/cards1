import { handlers } from "@/lib/auth";

export const { GET, POST } = handlers;

/**
 * @implements BR-301 - NextAuth API Route
 * This catch-all route handles all NextAuth.js authentication flows.
 * It provides the standard GET/POST handlers required for OAuth and Email sign-ins.
 */
export const runtime = "nodejs"; // Standard runtime for database-backed sessions
