/*
  # Add Uniqueness Constraints for Contract Address + Token ID

  1. Security Changes
    - Adds unique constraint on (contract_address, token_id) for artworks table
    - Adds unique constraint on (contract_address, edition_id_on_chain) for editions table
    - Prevents duplicate token claims that caused the Day Zero / SIGNAL bug

  2. Important Notes
    - These constraints will fail if duplicate data already exists
    - Only applies to rows where both fields are NOT NULL (partial unique index)
    - This is a critical data integrity fix
*/

-- Add unique constraint for artworks: same contract + token_id cannot be claimed twice
CREATE UNIQUE INDEX IF NOT EXISTS idx_artworks_contract_token_unique
  ON artworks (contract_address, token_id)
  WHERE contract_address IS NOT NULL AND token_id IS NOT NULL;

-- Add unique constraint for editions: same contract + edition_id_on_chain cannot be claimed twice
CREATE UNIQUE INDEX IF NOT EXISTS idx_editions_contract_edition_unique
  ON editions (contract_address, edition_id_on_chain)
  WHERE contract_address IS NOT NULL AND edition_id_on_chain IS NOT NULL;
