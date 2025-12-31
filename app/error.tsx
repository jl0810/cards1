'use client';

/**
 * Root Error Boundary
 * Catches unhandled errors in the app and displays a user-friendly message
 * 
 * @module app/error
 * @implements BR-035 - Error Handling
 * @satisfies US-021 - Graceful Error Recovery
 * @tested None (needs E2E test)
 */

import { useEffect } from 'react';

import { Button } from '@/components/ui/button';
import { AlertTriangle, Wrench } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to console
    console.error("Root Error Boundary caught error:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 text-center">
        <div className="flex justify-center mb-4">
          <AlertTriangle className="h-12 w-12 text-red-500" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
          Something went wrong
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          We&apos;ve been notified and are looking into it.
        </p>
        <div className="flex items-center gap-2 mb-4">
          <Button onClick={reset} className="bg-indigo-600 hover:bg-indigo-700 px-4 py-2 text-sm">
            Try again
          </Button>
          <Button
            onClick={() => window.location.reload()}
            className="bg-indigo-600 hover:bg-indigo-700 px-4 py-2 text-sm flex items-center gap-2"
          >
            <Wrench className="h-3 w-3" />
            Fix
          </Button>
        </div>
        <Button
          variant="outline"
          onClick={() => (window.location.href = '/')}
          className="w-full px-4 py-2 text-sm"
        >
          Go home
        </Button>
        {process.env.NODE_ENV === 'development' && (
          <details className="mt-6 text-left">
            <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300">
              Error details (development only)
            </summary>
            <pre className="mt-2 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-2 rounded overflow-auto max-h-32">
              {error.message}
              {error.digest && `\n\nDigest: ${error.digest}`}
              {error.stack && `\n\nStack:\n${error.stack}`}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}
