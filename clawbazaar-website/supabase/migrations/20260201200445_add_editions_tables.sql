/*
  # Add Editions Tables for ERC1155 NFT Edition Minting

  1. New Tables
    - `editions`
      - `id` (uuid, primary key)
      - `agent_id` (uuid, foreign key to agents)
      - `title` (text)
      - `description` (text, nullable)
      - `image_url` (text)
      - `max_supply` (integer, 1-1000)
      - `total_minted` (integer, default 0)
      - `max_per_wallet` (integer)
      - `price_bzaar` (numeric)
      - `duration_hours` (integer, nullable for unlimited)
      - `mint_start` (timestamptz)
      - `mint_end` (timestamptz, nullable)
      - `is_active` (boolean, default true)
      - `edition_id_on_chain` (bigint, nullable)
      - `contract_address` (text, nullable)
      - `creation_tx_hash` (text, nullable)
      - `ipfs_metadata_uri` (text, nullable)
      - `royalty_bps` (integer, default 500)
      - `created_at` (timestamptz)

    - `edition_mints`
      - `id` (uuid, primary key)
      - `edition_id` (uuid, foreign key to editions)
      - `edition_number` (integer)
      - `minter_type` (text: 'agent' or 'user')
      - `minter_agent_id` (uuid, nullable)
      - `minter_user_id` (uuid, nullable)
      - `minter_wallet` (text)
      - `price_paid_bzaar` (numeric)
      - `tx_hash` (text, nullable)
      - `minted_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Add policies for public read access
    - Add policies for authenticated agent operations
    
  3. Indexes
    - Index on editions.agent_id for creator queries
    - Index on editions.is_active for active edition filtering
    - Index on edition_mints.edition_id for mint queries
    - Index on edition_mints.minter_wallet for wallet queries
*/

CREATE TABLE IF NOT EXISTS editions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES agents(id),
  title text NOT NULL,
  description text,
  image_url text NOT NULL,
  max_supply integer NOT NULL CHECK (max_supply > 0 AND max_supply <= 1000),
  total_minted integer NOT NULL DEFAULT 0,
  max_per_wallet integer NOT NULL DEFAULT 10,
  price_bzaar numeric NOT NULL CHECK (price_bzaar > 0),
  duration_hours integer,
  mint_start timestamptz NOT NULL DEFAULT now(),
  mint_end timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  edition_id_on_chain bigint,
  contract_address text,
  creation_tx_hash text,
  ipfs_metadata_uri text,
  royalty_bps integer NOT NULL DEFAULT 500 CHECK (royalty_bps >= 0 AND royalty_bps <= 1000),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS edition_mints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  edition_id uuid NOT NULL REFERENCES editions(id),
  edition_number integer NOT NULL,
  minter_type text NOT NULL CHECK (minter_type IN ('agent', 'user')),
  minter_agent_id uuid REFERENCES agents(id),
  minter_user_id uuid REFERENCES users(id),
  minter_wallet text NOT NULL,
  price_paid_bzaar numeric NOT NULL,
  tx_hash text,
  minted_at timestamptz DEFAULT now(),
  UNIQUE(edition_id, edition_number)
);

ALTER TABLE editions ENABLE ROW LEVEL SECURITY;
ALTER TABLE edition_mints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view editions"
  ON editions FOR SELECT
  USING (true);

CREATE POLICY "Agents can create their own editions"
  ON editions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM agent_api_keys 
      WHERE agent_id = editions.agent_id 
      AND revoked_at IS NULL
    )
  );

CREATE POLICY "Agents can update their own editions"
  ON editions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM agent_api_keys 
      WHERE agent_id = editions.agent_id 
      AND revoked_at IS NULL
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM agent_api_keys 
      WHERE agent_id = editions.agent_id 
      AND revoked_at IS NULL
    )
  );

CREATE POLICY "Anyone can view edition mints"
  ON edition_mints FOR SELECT
  USING (true);

CREATE POLICY "Anyone can create edition mints"
  ON edition_mints FOR INSERT
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_editions_agent_id ON editions(agent_id);
CREATE INDEX IF NOT EXISTS idx_editions_is_active ON editions(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_editions_created_at ON editions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_edition_mints_edition_id ON edition_mints(edition_id);
CREATE INDEX IF NOT EXISTS idx_edition_mints_minter_wallet ON edition_mints(minter_wallet);
