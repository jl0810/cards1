"use client";

import { useAuth, useUser } from "@clerk/nextjs";
import { env } from "@/env";
import Link from "next/link";

const REQUIRED_PLAN_SLUG = env.NEXT_PUBLIC_CLERK_REQUIRED_PLAN;

export function BillingStatus() {
  const { has, isLoaded } = useAuth();
  const { user } = useUser();

  if (!isLoaded) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
        <div className="flex items-center">
          <div className="animate-pulse flex space-x-4">
            <div className="rounded-full bg-gray-300 h-5 w-5"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-300 rounded w-3/4"></div>
              <div className="h-3 bg-gray-300 rounded w-1/2"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ✅ Clerk Billing is the source of truth: rely on plan access only
  const hasActiveSubscription = has({ plan: REQUIRED_PLAN_SLUG });

  if (hasActiveSubscription) {
    const isTrial = user?.publicMetadata?.subscriptionStatus === 'trialing';
    const trialEndsAt = user?.publicMetadata?.trialEndsAt as string;
    const trialDaysLeft = trialEndsAt ? Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 0;

    return (
      <div className={`${isTrial ? 'bg-blue-50 border-blue-200' : 'bg-green-50 border-green-200'} border rounded-lg p-4 mb-6`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              {isTrial ? (
                <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            <div className="ml-3">
              <h3 className={`text-sm font-medium ${isTrial ? 'text-blue-800' : 'text-green-800'}`}>
                {isTrial ? `Free Trial Active${trialDaysLeft > 0 ? ` (${trialDaysLeft} days left)` : ''}` : 'Subscription Active'}
              </h3>
              <p className={`text-sm ${isTrial ? 'text-blue-700' : 'text-green-700'} mt-1`}>
                {isTrial 
                  ? `Your free trial is active. Upgrade anytime to continue access.`
                  : 'Your subscription is active and all features are available.'
                }
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isTrial && (
              <Link
                href="/pricing"
                className="text-sm text-blue-800 hover:text-blue-900 font-medium"
              >
                Upgrade Now →
              </Link>
            )}
            <Link
              href="/billing"
              className={`text-sm ${isTrial ? 'text-blue-800 hover:text-blue-900' : 'text-green-800 hover:text-green-900'} font-medium`}
            >
              Manage →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800">
              No Active Subscription
            </h3>
            <p className="text-sm text-yellow-700 mt-1">
              Subscribe to access all dashboard features and premium content.
            </p>
          </div>
        </div>
        <Link
          href="/pricing"
          className="bg-yellow-600 hover:bg-yellow-700 text-white text-sm font-medium py-2 px-4 rounded-md transition-colors"
        >
          Choose Plan →
        </Link>
      </div>
    </div>
  );
}
