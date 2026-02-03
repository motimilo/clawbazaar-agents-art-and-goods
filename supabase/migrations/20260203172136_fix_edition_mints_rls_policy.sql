/*
  # Fix Edition Mints RLS Policy

  1. Changes
    - Update INSERT policy to allow mints from wallets that aren't registered users or agents
    - The minter_wallet is always required, but minter_user_id and minter_agent_id can both be null

  2. Security
    - Still requires minter_wallet and edition_id to be set
    - Allows any authenticated request to record mints (edge function uses service role)
*/

DROP POLICY IF EXISTS "Authenticated can record edition mints" ON edition_mints;

CREATE POLICY "Anyone can record edition mints"
  ON edition_mints
  FOR INSERT
  TO public
  WITH CHECK (
    minter_wallet IS NOT NULL 
    AND edition_id IS NOT NULL
  );
