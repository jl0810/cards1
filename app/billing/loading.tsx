/**
 * Billing Loading State
 * @module app/billing/loading
 */

import { Skeleton } from '@/components/ui/skeleton';

export default function BillingLoading() {
  return (
    <div className="flex-1 p-6 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <Skeleton className="h-8 w-32 mb-2" />
        <Skeleton className="h-4 w-48" />
      </div>

      {/* Current plan card */}
      <div className="border rounded-lg p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-5 w-24 mb-2" />
            <Skeleton className="h-8 w-32" />
          </div>
          <Skeleton className="h-10 w-28" />
        </div>
        <Skeleton className="h-2 w-full rounded-full" />
        <Skeleton className="h-4 w-40" />
      </div>

      {/* Payment method */}
      <div className="border rounded-lg p-6 space-y-4">
        <Skeleton className="h-6 w-36" />
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-16 rounded" />
          <div>
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24 mt-1" />
          </div>
        </div>
      </div>

      {/* Billing history */}
      <div className="border rounded-lg p-6 space-y-4">
        <Skeleton className="h-6 w-32" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center justify-between py-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-8 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}
