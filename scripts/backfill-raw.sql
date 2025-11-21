-- Create family_members table if not exists
CREATE TABLE IF NOT EXISTS family_members (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  avatar TEXT,
  color TEXT,
  role TEXT DEFAULT 'Member',
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add family_member_id columns if not exist
ALTER TABLE plaid_items ADD COLUMN IF NOT EXISTS family_member_id TEXT REFERENCES family_members(id) ON DELETE CASCADE;
ALTER TABLE plaid_accounts ADD COLUMN IF NOT EXISTS family_member_id TEXT REFERENCES family_members(id) ON DELETE CASCADE;

-- Create primary family members
INSERT INTO family_members (id, user_id, name, avatar, role, is_primary, created_at, updated_at)
SELECT gen_random_uuid(), up.id, COALESCE(up.name, 'Primary Member'), up.avatar, 'Owner', true, now(), now()
FROM user_profiles up
LEFT JOIN family_members fm ON fm.user_id = up.id AND fm.is_primary = true
WHERE fm.id IS NULL;

-- Update plaid_items
UPDATE plaid_items
SET family_member_id = fm.id
FROM family_members fm
WHERE plaid_items.user_id = fm.user_id
  AND fm.is_primary = true
  AND plaid_items.family_member_id IS NULL;

-- Update plaid_accounts
UPDATE plaid_accounts
SET family_member_id = pi.family_member_id
FROM plaid_items pi
WHERE plaid_accounts.plaid_item_id = pi.id
  AND plaid_accounts.family_member_id IS NULL;
