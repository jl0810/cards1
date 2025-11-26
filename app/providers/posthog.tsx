"use client";

import posthog from 'posthog-js';
import { PostHogProvider as PHProvider } from 'posthog-js/react';
import { useEffect } from 'react';

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Only load PostHog in production for better dev performance
    if (process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_POSTHOG_KEY) {
      posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
        api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com',
        // Performance optimizations
        loaded: (posthog) => {
          // Loaded callback
        },
        // Reduce network requests
        capture_pageview: false, // Manually control pageviews
        capture_pageleave: false,
      });
    }
  }, []);

  return <PHProvider client={posthog}>{children}</PHProvider>;
}
