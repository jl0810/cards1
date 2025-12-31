// sentry.client.config.ts
import * as Sentry from "@sentry/nextjs";

const SENTRY_DSN = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn: SENTRY_DSN || "https://719f40c140114679b5d0cef6ab99ee5d@errors.raydoug.com/2",
  tracesSampleRate: 0.1,
  environment: process.env.NODE_ENV || "development",
  tunnel: "/api/glitchtip-tunnel", // Path to your API route
});