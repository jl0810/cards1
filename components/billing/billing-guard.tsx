"use client";

import { useAuth } from "@/hooks/use-auth";
import Link from "next/link";
import { AlertCircle } from "lucide-react";

interface BillingGuardProps {
  children: React.ReactNode;
  plan?: string;
  feature?: string;
  fallback?: React.ReactNode;
}

export function BillingGuard({
  children,
  plan,
  feature,
  fallback = (
    <div className="glass-card border border-yellow-500/20 rounded-2xl p-8 text-center bg-yellow-500/5 backdrop-blur-md">
      <AlertCircle className="mx-auto h-12 w-12 text-yellow-500 mb-4" />
      <h3 className="text-xl font-bold text-white mb-2">Premium Feature</h3>
      <p className="text-gray-400 mb-6 max-w-sm mx-auto">
        This feature requires an active subscription to access. Upgrade your plan to unlock more potential.
      </p>
      <Link
        href="/pricing"
        className="inline-flex items-center px-6 py-2.5 bg-yellow-500 text-black font-bold rounded-full hover:bg-yellow-400 transition-colors shadow-lg shadow-yellow-500/20"
      >
        View Pricing Plans
      </Link>
    </div>
  )
}: BillingGuardProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return null;
  }

  // If no specific requirement, just check authentication
  if (!plan && !feature) {
    return user ? <>{children}</> : <>{fallback}</>;
  }

  // For now, default to free plan since we're migrating auth
  // Will be updated when subscription logic is moved to NextAuth.js session
  const userPlan = 'free';
  const userFeatures: string[] = [];

  const hasPlan = plan ? userPlan === plan : true;
  const hasFeature = feature ? userFeatures.includes(feature) : true;

  if (hasPlan && hasFeature) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
}
