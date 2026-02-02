/*
  # Rename BZAAR to BZAAR Throughout Schema

  1. Changes
    - Rename `price_csea` to `price_bzaar` in artworks table
    - Rename `price_csea` to `price_bzaar` in marketplace_listings table
    - Rename `csea_balance_cached` to `bzaar_balance_cached` in users table

  2. Rationale
    - The token contract is named BAZAAR, not BZAAR
    - Standardizing naming across database and codebase
    - Prevents confusion and bugs in buy/sell flows
*/

-- Rename columns in artworks table
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'artworks' AND column_name = 'price_csea'
  ) THEN
    ALTER TABLE artworks RENAME COLUMN price_csea TO price_bzaar;
  END IF;
END $$;

-- Rename columns in marketplace_listings table
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'marketplace_listings' AND column_name = 'price_csea'
  ) THEN
    ALTER TABLE marketplace_listings RENAME COLUMN price_csea TO price_bzaar;
  END IF;
END $$;

-- Rename columns in users table
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'csea_balance_cached'
  ) THEN
    ALTER TABLE users RENAME COLUMN csea_balance_cached TO bzaar_balance_cached;
  END IF;
END $$;