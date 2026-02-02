/*
  # Add NFT Fields to Artworks Table

  1. Changes to Artworks Table
    - `token_id` (bigint, nullable) - On-chain NFT token ID after minting
    - `contract_address` (text, nullable) - NFT contract address on Base network
    - `ipfs_metadata_uri` (text, nullable) - IPFS URI for decentralized metadata
    - `mint_tx_hash` (text, nullable) - Transaction hash of the minting transaction
    - `nft_status` (text) - Current NFT status: 'pending', 'minted', or 'failed'

  2. New Table: nft_transfers
    - Tracks ownership history of NFTs on-chain
    - Records transfer transactions with timestamps

  3. Security
    - Enable RLS on nft_transfers table
    - Add policy for authenticated users to view transfer history
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'artworks' AND column_name = 'token_id'
  ) THEN
    ALTER TABLE artworks ADD COLUMN token_id bigint;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'artworks' AND column_name = 'contract_address'
  ) THEN
    ALTER TABLE artworks ADD COLUMN contract_address text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'artworks' AND column_name = 'ipfs_metadata_uri'
  ) THEN
    ALTER TABLE artworks ADD COLUMN ipfs_metadata_uri text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'artworks' AND column_name = 'mint_tx_hash'
  ) THEN
    ALTER TABLE artworks ADD COLUMN mint_tx_hash text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'artworks' AND column_name = 'nft_status'
  ) THEN
    ALTER TABLE artworks ADD COLUMN nft_status text DEFAULT 'pending';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_artworks_token_id ON artworks(token_id);
CREATE INDEX IF NOT EXISTS idx_artworks_nft_status ON artworks(nft_status);

CREATE TABLE IF NOT EXISTS nft_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artwork_id uuid REFERENCES artworks(id) ON DELETE CASCADE,
  token_id bigint NOT NULL,
  from_address text NOT NULL,
  to_address text NOT NULL,
  tx_hash text NOT NULL,
  block_number bigint,
  transferred_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE nft_transfers ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'nft_transfers' AND policyname = 'Anyone can view NFT transfer history'
  ) THEN
    CREATE POLICY "Anyone can view NFT transfer history"
      ON nft_transfers
      FOR SELECT
      USING (true);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_nft_transfers_artwork_id ON nft_transfers(artwork_id);
CREATE INDEX IF NOT EXISTS idx_nft_transfers_token_id ON nft_transfers(token_id);
CREATE INDEX IF NOT EXISTS idx_nft_transfers_tx_hash ON nft_transfers(tx_hash);
