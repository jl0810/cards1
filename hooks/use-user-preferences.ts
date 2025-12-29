"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from 'react';

interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  language: string;
  timezone: string;
  emailNotifications: boolean;
  pushNotifications: boolean;
  marketingEmails: boolean;
  defaultDashboard: string;
  sidebarCollapsed: boolean;
  compactMode: boolean;
  betaFeatures: boolean;
  analyticsSharing: boolean;
  crashReporting: boolean;
  autoSave: boolean;
  keyboardShortcuts: boolean;
  soundEffects: boolean;
  newsletter: boolean;
  notifications: boolean;
}

const defaultPreferences: UserPreferences = {
  theme: 'system',
  language: 'en',
  timezone: 'UTC',
  emailNotifications: true,
  pushNotifications: false,
  marketingEmails: false,
  defaultDashboard: 'main',
  sidebarCollapsed: false,
  compactMode: false,
  betaFeatures: false,
  analyticsSharing: true,
  crashReporting: true,
  autoSave: true,
  keyboardShortcuts: true,
  soundEffects: false,
  newsletter: false,
  notifications: true,
};

export function useUserPreferences() {
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(true);
  const [preferences, setPreferences] = useState<UserPreferences>(defaultPreferences);
  const [error, setError] = useState<string | null>(null);

  const user = session?.user;

  // Load user and preferences
  useEffect(() => {
    if (status === "loading") return;

    if (user) {
      loadPreferences();
    } else {
      setLoading(false);
    }
  }, [user, status]);

  async function loadPreferences() {
    try {
      setLoading(true);
      const response = await fetch('/api/user/preferences');

      if (!response.ok) {
        throw new Error('Failed to load preferences');
      }

      const data = await response.json();
      setPreferences({ ...defaultPreferences, ...data });
    } catch (err) {
      console.error('Error loading preferences:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  // Update preferences
  const updatePreferences = async (newPreferences: Partial<UserPreferences>) => {
    if (!user) return;

    try {
      const updatedPreferences = { ...preferences, ...newPreferences };

      const response = await fetch('/api/user/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedPreferences),
      });

      if (!response.ok) {
        throw new Error('Failed to update preferences');
      }

      setPreferences(updatedPreferences);
    } catch (err) {
      console.error('Error updating preferences:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    }
  };

  // Reset to defaults
  const resetPreferences = async () => {
    await updatePreferences(defaultPreferences);
  };

  // Update single preference
  const updatePreference = async (key: keyof UserPreferences, value: UserPreferences[keyof UserPreferences]) => {
    await updatePreferences({ [key]: value });
  };

  return {
    preferences,
    updatePreferences,
    updatePreference,
    resetPreferences,
    loading: loading || status === "loading",
    error,
  };
}
