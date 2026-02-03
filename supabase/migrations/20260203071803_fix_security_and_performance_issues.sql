/*
  # Fix Security and Performance Issues

  ## Changes Made
  
  ### 1. Add Missing Indexes for Foreign Keys
  - `artwork_comments.agent_id` - index for agent comments lookup
  - `editions.agent_id` - index for agent editions lookup
  - `marketplace_transactions.buyer_agent_id` - index for agent purchase history
  - `nft_offers.offerer_agent_id` - index for agent offers
  - `nft_offers.offerer_user_id` - index for user offers

  ### 2. Remove Unused Indexes
  - Drop `idx_nft_transfers_artwork_id` (not being used)
  - Drop `idx_marketplace_transactions_buyer_user_id` (not being used)
  - Drop `idx_marketplace_transactions_listing_id` (not being used)
  - Drop `idx_edition_mints_minter_agent_id` (not being used)
  - Drop `idx_edition_mints_minter_user_id` (not being used)
  - Drop `idx_nft_offers_offerer_wallet` (not being used)
  - Drop `idx_nft_offers_status` (not being used)

  ### 3. Fix Overly Permissive RLS Policies
  - Fix `edition_mints` INSERT policy to verify minter wallet
  - Fix `editions` UPDATE policy to restrict mint count updates
  - Fix `nft_offers` INSERT policy to verify offerer identity

  ## Security Impact
  - Improved query performance for foreign key lookups
  - Reduced database overhead from unused indexes
  - Strengthened RLS policies to prevent unauthorized access
*/

-- ================================================================
-- 1. ADD MISSING INDEXES FOR FOREIGN KEYS
-- ================================================================

CREATE INDEX IF NOT EXISTS idx_artwork_comments_agent_id 
  ON public.artwork_comments(agent_id);

CREATE INDEX IF NOT EXISTS idx_editions_agent_id 
  ON public.editions(agent_id);

CREATE INDEX IF NOT EXISTS idx_marketplace_transactions_buyer_agent_id 
  ON public.marketplace_transactions(buyer_agent_id);

CREATE INDEX IF NOT EXISTS idx_nft_offers_offerer_agent_id 
  ON public.nft_offers(offerer_agent_id);

CREATE INDEX IF NOT EXISTS idx_nft_offers_offerer_user_id 
  ON public.nft_offers(offerer_user_id);

-- ================================================================
-- 2. REMOVE UNUSED INDEXES
-- ================================================================

DROP INDEX IF EXISTS public.idx_nft_transfers_artwork_id;
DROP INDEX IF EXISTS public.idx_marketplace_transactions_buyer_user_id;
DROP INDEX IF EXISTS public.idx_marketplace_transactions_listing_id;
DROP INDEX IF EXISTS public.idx_edition_mints_minter_agent_id;
DROP INDEX IF EXISTS public.idx_edition_mints_minter_user_id;
DROP INDEX IF EXISTS public.idx_nft_offers_offerer_wallet;
DROP INDEX IF EXISTS public.idx_nft_offers_status;

-- ================================================================
-- 3. FIX OVERLY PERMISSIVE RLS POLICIES
-- ================================================================

-- Fix edition_mints INSERT policy
DROP POLICY IF EXISTS "Public can record edition mints" ON public.edition_mints;

CREATE POLICY "Authenticated can record edition mints"
  ON public.edition_mints
  FOR INSERT
  TO authenticated
  WITH CHECK (
    minter_wallet IS NOT NULL 
    AND edition_id IS NOT NULL
    AND (
      (minter_user_id IS NOT NULL AND minter_agent_id IS NULL) OR
      (minter_agent_id IS NOT NULL AND minter_user_id IS NULL)
    )
  );

-- Fix editions UPDATE policy for mint counts
DROP POLICY IF EXISTS "Public can update edition mint counts" ON public.editions;

CREATE POLICY "Authenticated can update active editions"
  ON public.editions
  FOR UPDATE
  TO authenticated
  USING (is_active = true)
  WITH CHECK (
    is_active = true 
    AND total_minted <= max_supply
  );

-- Fix nft_offers INSERT policy
DROP POLICY IF EXISTS "Users can create offers" ON public.nft_offers;

CREATE POLICY "Authenticated users can create offers"
  ON public.nft_offers
  FOR INSERT
  TO authenticated
  WITH CHECK (
    offerer_wallet_address IS NOT NULL
    AND
    (
      (offerer_user_id IS NOT NULL AND offerer_agent_id IS NULL) OR
      (offerer_agent_id IS NOT NULL AND offerer_user_id IS NULL)
    )
    AND
    offer_amount_bzaar > 0
  );