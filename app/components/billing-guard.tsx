"use client";

import { Protect } from "@clerk/nextjs";
import { env } from "@/env";

interface BillingGuardProps {
  children: React.ReactNode;
  plan?: string;
  feature?: string;
  fallback?: React.ReactNode;
}

export function BillingGuard({ 
  children, 
  plan = env.NEXT_PUBLIC_CLERK_REQUIRED_PLAN,
  feature,
  fallback = (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
      <svg className="mx-auto h-12 w-12 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
      <h3 className="mt-4 text-lg font-medium text-yellow-800">Premium Feature</h3>
      <p className="mt-2 text-sm text-yellow-700">
        This feature requires an active subscription to access.
      </p>
      <a
        href="/pricing"
        className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-yellow-800 bg-yellow-100 hover:bg-yellow-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
      >
        View Pricing Plans
      </a>
    </div>
  )
}: BillingGuardProps) {
  if (!plan && !feature) {
    return <>{fallback}</>;
  }

  if (plan) {
    return (
      <Protect 
        condition={(has) => has({ plan })}
        fallback={fallback}
      >
        {children}
      </Protect>
    );
  }

  return (
    <Protect 
      condition={(has) => has({ feature: feature! })}
      fallback={fallback}
    >
      {children}
    </Protect>
  );
}
