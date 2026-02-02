/*
  # Fix Database Indexes and RLS Security

  1. Add Missing Indexes for Foreign Keys
    - `idx_edition_mints_minter_agent_id` on edition_mints(minter_agent_id)
    - `idx_edition_mints_minter_user_id` on edition_mints(minter_user_id)
    - `idx_marketplace_transactions_buyer_user_id` on marketplace_transactions(buyer_user_id)
    - `idx_marketplace_transactions_listing_id` on marketplace_transactions(listing_id)
    - `idx_nft_transfers_artwork_id` on nft_transfers(artwork_id)

  2. Drop Unused Indexes
    - `idx_artwork_comments_agent_id` - not being used
    - `idx_marketplace_transactions_buyer_agent_id` - not being used
    - `idx_editions_agent_id` - not being used
    - `idx_editions_is_active` - not being used
    - `idx_edition_mints_edition_id` - not being used (covered by unique constraint)
    - `idx_edition_mints_minter_wallet` - not being used

  3. Security Fix
    - Replace overly permissive RLS policy on edition_mints
    - New policy requires authentication for insert operations

  4. Notes
    - Auth DB Connection Strategy is a Supabase project setting, not fixable via migration
*/

-- Add missing indexes for foreign keys
CREATE INDEX IF NOT EXISTS idx_edition_mints_minter_agent_id 
  ON edition_mints(minter_agent_id) 
  WHERE minter_agent_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_edition_mints_minter_user_id 
  ON edition_mints(minter_user_id) 
  WHERE minter_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_marketplace_transactions_buyer_user_id 
  ON marketplace_transactions(buyer_user_id) 
  WHERE buyer_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_marketplace_transactions_listing_id 
  ON marketplace_transactions(listing_id);

CREATE INDEX IF NOT EXISTS idx_nft_transfers_artwork_id 
  ON nft_transfers(artwork_id);

-- Drop unused indexes
DROP INDEX IF EXISTS idx_artwork_comments_agent_id;
DROP INDEX IF EXISTS idx_marketplace_transactions_buyer_agent_id;
DROP INDEX IF EXISTS idx_editions_agent_id;
DROP INDEX IF EXISTS idx_editions_is_active;
DROP INDEX IF EXISTS idx_edition_mints_edition_id;
DROP INDEX IF EXISTS idx_edition_mints_minter_wallet;

-- Fix RLS policy on edition_mints that allows unrestricted access
DROP POLICY IF EXISTS "Anyone can create edition mints" ON edition_mints;

CREATE POLICY "Authenticated users can create edition mints"
  ON edition_mints
  FOR INSERT
  TO authenticated
  WITH CHECK (
    minter_user_id = auth.uid()
    OR minter_agent_id IN (SELECT id FROM agents WHERE id = minter_agent_id)
  );
