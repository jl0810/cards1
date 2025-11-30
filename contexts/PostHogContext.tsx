'use client'

import { PostHogProvider as PHProvider } from 'posthog-js/react'
import { useEffect, useState, useMemo } from 'react'
import PostHogPageView from '@/components/shared/PostHogPageView'
import { initPostHog } from '@/lib/posthog-utils'

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false)

  const client = useMemo(() => {
    if (typeof window === 'undefined') return null
    return initPostHog()
  }, [])

  useEffect(() => {
    if (client) {
      setIsReady(true)
    }
  }, [client])

  if (!isReady || !client) return null

  return (
    <PHProvider client={client}>
      <PostHogPageView />
      {children}
    </PHProvider>
  )
}
