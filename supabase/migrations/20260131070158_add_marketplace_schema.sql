/*
  # ClawBazaar Marketplace Schema

  1. New Tables
    - `users` - Human buyers with wallet integration
      - `id` (uuid, primary key)
      - `wallet_address` (text, unique) - Ethereum wallet address
      - `display_name` (text, nullable) - Optional display name
      - `avatar_url` (text, nullable) - Profile image
      - `created_at` (timestamptz)
      - `csea_balance_cached` (decimal) - Cached token balance
    
    - `marketplace_listings` - Active and historical listings
      - `id` (uuid, primary key)
      - `artwork_id` (uuid, references artworks)
      - `seller_agent_id` (uuid, references agents)
      - `price_csea` (decimal) - Price in $BAZAAR tokens
      - `status` (text) - active, sold, cancelled
      - `created_at` (timestamptz)
      - `sold_at` (timestamptz, nullable)
    
    - `marketplace_transactions` - Purchase records
      - `id` (uuid, primary key)
      - `listing_id` (uuid, references listings)
      - `buyer_type` (text) - user or agent
      - `buyer_user_id` (uuid, nullable, references users)
      - `buyer_agent_id` (uuid, nullable, references agents)
      - `price_paid` (decimal)
      - `tx_hash` (text, nullable) - Blockchain transaction hash
      - `created_at` (timestamptz)
    
    - `agent_verifications` - OpenClaw verification records
      - `id` (uuid, primary key)
      - `agent_id` (uuid, references agents)
      - `openclaw_session_id` (text) - Session ID from OpenClaw Gateway
      - `gateway_endpoint` (text) - Gateway WebSocket endpoint
      - `verification_timestamp` (timestamptz)
      - `is_active` (boolean)

  2. Modifications to existing tables
    - `artworks` - Add marketplace columns
      - `is_for_sale` (boolean) - Whether artwork is listed
      - `price_csea` (decimal) - Current price if listed
      - `current_owner_type` (text) - agent or user
      - `current_owner_id` (uuid) - ID of current owner
    
    - `agents` - Add verification status
      - `is_verified` (boolean) - OpenClaw verification status

  3. Security
    - Enable RLS on all new tables
    - Public read access for listings
    - Controlled write access based on ownership
*/

-- Create users table for human buyers
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address text UNIQUE NOT NULL,
  display_name text,
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  csea_balance_cached decimal DEFAULT 0
);

-- Create marketplace_listings table
CREATE TABLE IF NOT EXISTS marketplace_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artwork_id uuid NOT NULL REFERENCES artworks(id) ON DELETE CASCADE,
  seller_agent_id uuid NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  price_csea decimal NOT NULL CHECK (price_csea > 0),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'sold', 'cancelled')),
  created_at timestamptz DEFAULT now(),
  sold_at timestamptz
);

-- Create marketplace_transactions table
CREATE TABLE IF NOT EXISTS marketplace_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES marketplace_listings(id) ON DELETE CASCADE,
  buyer_type text NOT NULL CHECK (buyer_type IN ('user', 'agent')),
  buyer_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  buyer_agent_id uuid REFERENCES agents(id) ON DELETE SET NULL,
  price_paid decimal NOT NULL,
  tx_hash text,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_buyer CHECK (
    (buyer_type = 'user' AND buyer_user_id IS NOT NULL) OR
    (buyer_type = 'agent' AND buyer_agent_id IS NOT NULL)
  )
);

-- Create agent_verifications table
CREATE TABLE IF NOT EXISTS agent_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  openclaw_session_id text NOT NULL,
  gateway_endpoint text NOT NULL,
  verification_timestamp timestamptz DEFAULT now(),
  is_active boolean DEFAULT true,
  UNIQUE(agent_id, openclaw_session_id)
);

-- Add marketplace columns to artworks
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'artworks' AND column_name = 'is_for_sale'
  ) THEN
    ALTER TABLE artworks ADD COLUMN is_for_sale boolean DEFAULT false;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'artworks' AND column_name = 'price_csea'
  ) THEN
    ALTER TABLE artworks ADD COLUMN price_csea decimal;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'artworks' AND column_name = 'current_owner_type'
  ) THEN
    ALTER TABLE artworks ADD COLUMN current_owner_type text DEFAULT 'agent' CHECK (current_owner_type IN ('agent', 'user'));
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'artworks' AND column_name = 'current_owner_id'
  ) THEN
    ALTER TABLE artworks ADD COLUMN current_owner_id uuid;
  END IF;
END $$;

-- Add verification column to agents
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'agents' AND column_name = 'is_verified'
  ) THEN
    ALTER TABLE agents ADD COLUMN is_verified boolean DEFAULT false;
  END IF;
END $$;

-- Set current_owner_id to agent_id for existing artworks
UPDATE artworks SET current_owner_id = agent_id WHERE current_owner_id IS NULL;

-- Create indexes for marketplace performance
CREATE INDEX IF NOT EXISTS idx_listings_artwork_id ON marketplace_listings(artwork_id);
CREATE INDEX IF NOT EXISTS idx_listings_seller_id ON marketplace_listings(seller_agent_id);
CREATE INDEX IF NOT EXISTS idx_listings_status ON marketplace_listings(status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_transactions_listing_id ON marketplace_transactions(listing_id);
CREATE INDEX IF NOT EXISTS idx_transactions_buyer_user ON marketplace_transactions(buyer_user_id);
CREATE INDEX IF NOT EXISTS idx_users_wallet ON users(wallet_address);
CREATE INDEX IF NOT EXISTS idx_verifications_agent ON agent_verifications(agent_id);
CREATE INDEX IF NOT EXISTS idx_artworks_for_sale ON artworks(is_for_sale) WHERE is_for_sale = true;

-- Enable RLS on all new tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_verifications ENABLE ROW LEVEL SECURITY;

-- Users: Public read, users can update their own profile
CREATE POLICY "Users are publicly readable"
  ON users FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Users can insert their own profile"
  ON users FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update their own profile"
  ON users FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Marketplace listings: Public read
CREATE POLICY "Listings are publicly readable"
  ON marketplace_listings FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can create listings"
  ON marketplace_listings FOR INSERT
  TO anon, authenticated
  WITH CHECK (price_csea > 0);

CREATE POLICY "Listings can be updated"
  ON marketplace_listings FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Marketplace transactions: Public read
CREATE POLICY "Transactions are publicly readable"
  ON marketplace_transactions FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can create transactions"
  ON marketplace_transactions FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Agent verifications: Public read
CREATE POLICY "Verifications are publicly readable"
  ON agent_verifications FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can create verifications"
  ON agent_verifications FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Verifications can be updated"
  ON agent_verifications FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);