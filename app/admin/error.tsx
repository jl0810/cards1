'use client';

/**
 * Admin Error Boundary
 * Catches errors in admin routes with admin-specific messaging
 * 
 * @module app/admin/error
 * @implements BR-035 - Error Handling
 * @satisfies US-021 - Graceful Error Recovery
 */

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, ArrowLeft } from 'lucide-react';

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error, {
      tags: { area: 'admin' },
      level: 'error',
    });
  }, [error]);

  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 text-center border border-red-200 dark:border-red-800">
        <div className="flex justify-center mb-4">
          <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-full">
            <AlertTriangle className="h-8 w-8 text-red-500" />
          </div>
        </div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
          Admin Panel Error
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-2">
          An error occurred in the admin panel.
        </p>
        <p className="text-sm text-amber-600 dark:text-amber-400 mb-6">
          This has been logged for investigation.
        </p>
        <div className="space-y-3">
          <Button onClick={reset} variant="destructive" className="w-full gap-2">
            <RefreshCw className="h-4 w-4" />
            Retry Operation
          </Button>
          <Button
            variant="outline"
            onClick={() => (window.location.href = '/dashboard')}
            className="w-full gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
        </div>
        {/* Always show error details in admin */}
        <details className="mt-6 text-left" open>
          <summary className="cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-300">
            Error Details
          </summary>
          <pre className="mt-2 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-3 rounded overflow-auto max-h-40 font-mono">
            {error.message}
            {error.stack && `\n\n${error.stack}`}
            {error.digest && `\n\nDigest: ${error.digest}`}
          </pre>
        </details>
      </div>
    </div>
  );
}
