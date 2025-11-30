"use client";

import * as Sentry from "@sentry/nextjs";
import { ErrorBoundary as SentryErrorBoundary } from "@sentry/nextjs";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import { logger } from "@/lib/logger";
import { ReactErrorInfoSchema } from "@/lib/validations";
import type { z } from "zod";

type ReactErrorInfo = z.infer<typeof ReactErrorInfoSchema>;

export function ErrorBoundary({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SentryErrorBoundary
      fallback={({ error, resetError }) => (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="flex justify-center mb-4">
              <AlertTriangle className="h-12 w-12 text-red-500" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Something went wrong
            </h2>
            <p className="text-gray-600 mb-6">
              We&apos;re sorry, but something unexpected happened. Our team has been notified.
            </p>
            <div className="space-y-3">
              <Button onClick={resetError} className="w-full">
                Try again
              </Button>
              <Button 
                variant="outline" 
                onClick={() => window.location.href = '/'}
                className="w-full"
              >
                Go home
              </Button>
            </div>
            {process.env.NODE_ENV === 'development' && (
              <details className="mt-6 text-left">
                <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                  Error details (development only)
                </summary>
                <pre className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded overflow-auto">
                  {error instanceof Error ? error.message : String(error)}
                </pre>
              </details>
            )}
          </div>
        </div>
      )}
      onError={(error, errorInfo) => {
        logger.error('Error caught by boundary', error, {
          componentStack: (errorInfo as ReactErrorInfo) || 'No component stack available',
        });
        Sentry.captureException(error, {
          contexts: {
            react: {
              componentStack: (errorInfo as ReactErrorInfo) || 'No component stack available',
            },
          },
        });
      }}
    >
      {children}
    </SentryErrorBoundary>
  );
}
