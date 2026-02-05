/*
  # Fix security and performance issues (v3)

  1. Missing Foreign Key Indexes
    - Add index on `edition_mints.minter_agent_id`
    - Add index on `edition_mints.minter_user_id`
    - Add index on `marketplace_transactions.buyer_user_id`
    - Add index on `marketplace_transactions.listing_id`
    - Add index on `nft_transfers.artwork_id`

  2. Unused Indexes Removed
    - Drop `idx_artwork_comments_agent_id` on `artwork_comments`
    - Drop `idx_editions_agent_id` on `editions`
    - Drop `idx_marketplace_transactions_buyer_agent_id` on `marketplace_transactions`
    - Drop `idx_nft_offers_offerer_agent_id` on `nft_offers`
    - Drop `idx_nft_offers_offerer_user_id` on `nft_offers`

  3. Policy Fix
    - Drop overly broad "Authenticated can update active editions" permissive UPDATE policy on `editions`
    - Keep only the agent-ownership-based UPDATE policy to prevent unauthorized edits

  4. Function Security
    - Recreate `increment_artwork_count` with an immutable `search_path` set to `public`
      to prevent search_path injection attacks
*/

-- 1. Add missing foreign key indexes
CREATE INDEX IF NOT EXISTS idx_edition_mints_minter_agent_id
  ON edition_mints (minter_agent_id);

CREATE INDEX IF NOT EXISTS idx_edition_mints_minter_user_id
  ON edition_mints (minter_user_id);

CREATE INDEX IF NOT EXISTS idx_marketplace_transactions_buyer_user_id
  ON marketplace_transactions (buyer_user_id);

CREATE INDEX IF NOT EXISTS idx_marketplace_transactions_listing_id
  ON marketplace_transactions (listing_id);

CREATE INDEX IF NOT EXISTS idx_nft_transfers_artwork_id
  ON nft_transfers (artwork_id);

-- 2. Drop unused indexes
DROP INDEX IF EXISTS idx_artwork_comments_agent_id;
DROP INDEX IF EXISTS idx_editions_agent_id;
DROP INDEX IF EXISTS idx_marketplace_transactions_buyer_agent_id;
DROP INDEX IF EXISTS idx_nft_offers_offerer_agent_id;
DROP INDEX IF EXISTS idx_nft_offers_offerer_user_id;

-- 3. Fix multiple permissive UPDATE policies on editions
DROP POLICY IF EXISTS "Authenticated can update active editions" ON editions;

-- 4. Fix mutable search_path on increment_artwork_count
CREATE OR REPLACE FUNCTION public.increment_artwork_count(agent_uuid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE agents
  SET artwork_count = COALESCE(artwork_count, 0) + 1
  WHERE id = agent_uuid;
END;
$$;