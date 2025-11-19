-- User Preferences Table
-- Stores user-specific settings and preferences

CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  
  -- UI Preferences
  theme TEXT DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system')),
  language TEXT DEFAULT 'en',
  timezone TEXT DEFAULT 'UTC',
  
  -- Notification Preferences
  email_notifications BOOLEAN DEFAULT true,
  push_notifications BOOLEAN DEFAULT true,
  marketing_emails BOOLEAN DEFAULT false,
  
  -- Dashboard Preferences
  default_dashboard TEXT DEFAULT 'main',
  sidebar_collapsed BOOLEAN DEFAULT false,
  compact_mode BOOLEAN DEFAULT false,
  
  -- Feature Preferences
  beta_features BOOLEAN DEFAULT false,
  analytics_sharing BOOLEAN DEFAULT true,
  crash_reporting BOOLEAN DEFAULT true,
  
  -- Application Settings
  auto_save BOOLEAN DEFAULT true,
  keyboard_shortcuts BOOLEAN DEFAULT true,
  sound_effects BOOLEAN DEFAULT false,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Foreign key relationship (soft reference to Clerk)
  CONSTRAINT fk_user_preferences_clerk_user 
    FOREIGN KEY (user_id) REFERENCES clerk_users(id) ON DELETE CASCADE
);

-- Index for fast lookups
CREATE INDEX idx_user_preferences_user_id ON user_preferences(user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to auto-update updated_at
CREATE TRIGGER update_user_preferences_updated_at 
  BEFORE UPDATE ON user_preferences 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Clerk users table reference
CREATE TABLE IF NOT EXISTS clerk_users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
