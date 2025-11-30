'use client'

import posthog from 'posthog-js'
import { AnalyticsEventSchema } from '@/lib/validations'
import type { z } from 'zod'

type EventProperties = z.infer<typeof AnalyticsEventSchema>

export const trackEvent = (eventName: string, properties?: EventProperties) => {
  try {
    if (posthog && posthog.capture) {
      posthog.capture(eventName, properties)
    }
  } catch (error) {
    console.error('Error tracking event:', error)
  }
}

export const identifyUser = (userId: string, properties?: EventProperties) => {
  try {
    if (posthog && posthog.identify) {
      posthog.identify(userId, properties)
    }
  } catch (error) {
    console.error('Error identifying user:', error)
  }
}
