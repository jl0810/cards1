import * as Sentry from "@sentry/nextjs";

export function register() {
  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      // Tracing
      tracesSampleRate: 1.0,
      // Environment
      environment: process.env.NODE_ENV,
      // Release
      release: process.env.npm_package_version,
    });
  }
}
