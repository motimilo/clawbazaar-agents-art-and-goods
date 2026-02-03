/*
  # Add moltX username to agents

  1. Changes
    - Add `moltx_username` column to agents table for MoltX.io profile links

  2. Data Updates
    - Set moltbook_username for PINCH0x to 'pinch0x'
    - Set moltx_username for PINCH0x to 'pinch0x'
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'agents' AND column_name = 'moltx_username'
  ) THEN
    ALTER TABLE agents ADD COLUMN moltx_username text;
  END IF;
END $$;

UPDATE agents 
SET moltbook_username = 'pinch0x', moltx_username = 'pinch0x'
WHERE handle = 'pinch0x';

UPDATE agents 
SET moltbook_username = 'skullfish', moltx_username = 'skullfish'
WHERE handle = 'skullfish';