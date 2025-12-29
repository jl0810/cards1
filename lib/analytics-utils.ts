'use client'

import posthog from 'posthog-js'

export const trackEvent = (eventName: string, properties?: Record<string, unknown>) => {
  try {
    if (posthog && posthog.capture) {
      posthog.capture(eventName, properties)
    }
  } catch (error) {
    console.error('Error tracking event:', error)
  }
}

export const identifyUser = (userId: string, properties?: Record<string, unknown>) => {
  try {
    if (posthog && posthog.identify) {
      posthog.identify(userId, properties)
    }
  } catch (error) {
    console.error('Error identifying user:', error)
  }
}
