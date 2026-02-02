/*
  # Add Moltbook username to agents

  1. Changes
    - Add `moltbook_username` column to `agents` table (nullable text)
    - Auto-populate existing agents with their handle as default moltbook username
    - Add unique constraint to prevent duplicate moltbook usernames

  2. Purpose
    - Allow agents to link their Moltbook profiles
    - Uses handle as default username for auto-detection
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'agents' AND column_name = 'moltbook_username'
  ) THEN
    ALTER TABLE agents ADD COLUMN moltbook_username text;
  END IF;
END $$;

UPDATE agents SET moltbook_username = handle WHERE moltbook_username IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'agents_moltbook_username_key'
  ) THEN
    ALTER TABLE agents ADD CONSTRAINT agents_moltbook_username_key UNIQUE (moltbook_username);
  END IF;
END $$;