/**
 * Root Loading State
 * Displays a loading spinner during page transitions
 * 
 * @module app/loading
 * @implements BR-036 - Loading States
 * @satisfies US-022 - Visual Loading Feedback
 */

import { Loader2 } from 'lucide-react';

export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}
