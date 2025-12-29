"use client";

import { useAuth } from "@/hooks/use-auth";
import Link from "next/link";
import { ShieldCheck, AlertTriangle, Clock, CreditCard } from "lucide-react";

export function BillingStatus() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="glass-card border border-white/5 rounded-2xl p-6 mb-8 bg-white/5 animate-pulse">
        <div className="flex items-center space-x-4">
          <div className="rounded-full bg-gray-700 h-10 w-10"></div>
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-700 rounded w-3/4"></div>
            <div className="h-3 bg-gray-700 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  // For now, default to free plan since we're migrating auth
  const userPlan = 'free';
  const subscriptionStatus = 'none';
  const trialEndsAt = null;

  const isActive = false;
  const isTrial = false;
  const trialDaysLeft = 0;

  if (isActive) {
    return (
      <div className={`glass-card border ${isTrial ? 'border-blue-500/20 bg-blue-500/5' : 'border-emerald-500/20 bg-emerald-500/5'} rounded-2xl p-6 mb-8 backdrop-blur-md transition-all hover:border-white/10`}>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-start">
            <div className={`p-2 rounded-xl ${isTrial ? 'bg-blue-500/10 text-blue-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
              {isTrial ? <Clock className="h-6 w-6" /> : <ShieldCheck className="h-6 w-6" />}
            </div>
            <div className="ml-4">
              <h3 className={`text-lg font-bold ${isTrial ? 'text-blue-100' : 'text-emerald-100'}`}>
                {isTrial ? `Free Trial Active${trialDaysLeft > 0 ? ` (${trialDaysLeft} days left)` : ''}` : `${userPlan.toUpperCase()} Plan Active`}
              </h3>
              <p className="text-slate-400 text-sm mt-1 max-w-md">
                {isTrial
                  ? `You are currently in your trial period. Upgrade anytime to maintain uninterrupted access to all features.`
                  : 'Your subscription is active. You have full access to all premium dashboard features and real-time syncing.'
                }
              </p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-3">
            {isTrial && (
              <Button asChild variant="link" className="text-blue-400 hover:text-blue-300">
                <Link href="/pricing">Upgrade Now</Link>
              </Button>
            )}
            <Button asChild variant="outline" className="border-white/10 bg-white/5 hover:bg-white/10 text-white rounded-full">
              <Link href="/billing">Manage Billing</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card border border-yellow-500/20 bg-yellow-500/5 rounded-2xl p-6 mb-8 backdrop-blur-md">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-start">
          <div className="p-2 rounded-xl bg-yellow-500/10 text-yellow-500">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div className="ml-4">
            <h3 className="text-lg font-bold text-yellow-100">
              Free Access
            </h3>
            <p className="text-slate-400 text-sm mt-1 max-w-md">
              You are currently on the free tier. Subscribe to a premium plan to unlock bank connections, points optimization, and advanced analytics.
            </p>
          </div>
        </div>
        <Button asChild className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-full shadow-lg shadow-yellow-500/20 px-8">
          <Link href="/pricing">Upgrade Plan</Link>
        </Button>
      </div>
    </div>
  );
}

// Internal Button component since I'm using Shadcn later or just import from UI
import { Button } from "@/components/ui/button";
