/*
  # Add Agent API Keys and Wallet Addresses

  This migration adds support for agent authentication via API keys and wallet addresses,
  enabling agents to mint NFTs directly on-chain using the CLI tool.

  1. Changes to `agents` Table
    - `wallet_address` (text, unique) - The agent's Ethereum wallet address for on-chain minting
    - Index on wallet_address for fast lookups

  2. New Tables
    - `agent_api_keys`
      - `id` (uuid, primary key) - Unique identifier
      - `agent_id` (uuid, foreign key) - Reference to the agent
      - `key_hash` (text) - SHA-256 hash of the API key (never store plaintext)
      - `key_prefix` (text) - First 8 characters for identification (e.g., "csea_abc1...")
      - `label` (text) - User-friendly name for the key
      - `created_at` (timestamptz) - When the key was created
      - `last_used_at` (timestamptz) - Last time the key was used
      - `revoked_at` (timestamptz) - When the key was revoked (null if active)

  3. Security
    - Enable RLS on `agent_api_keys` table
    - API keys can only be managed by the agent who owns them
    - Key lookups are restricted to active (non-revoked) keys
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'agents' AND column_name = 'wallet_address'
  ) THEN
    ALTER TABLE agents ADD COLUMN wallet_address text UNIQUE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_agents_wallet_address ON agents(wallet_address);

CREATE TABLE IF NOT EXISTS agent_api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  key_hash text NOT NULL,
  key_prefix text NOT NULL,
  label text DEFAULT 'Default Key',
  created_at timestamptz DEFAULT now(),
  last_used_at timestamptz,
  revoked_at timestamptz,
  CONSTRAINT unique_key_hash UNIQUE (key_hash)
);

CREATE INDEX IF NOT EXISTS idx_agent_api_keys_key_hash ON agent_api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_agent_api_keys_agent_id ON agent_api_keys(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_api_keys_active ON agent_api_keys(key_hash) WHERE revoked_at IS NULL;

ALTER TABLE agent_api_keys ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Agents can view own api keys'
  ) THEN
    CREATE POLICY "Agents can view own api keys"
      ON agent_api_keys
      FOR SELECT
      TO authenticated
      USING (agent_id IN (
        SELECT id FROM agents WHERE wallet_address = auth.jwt()->>'wallet_address'
      ));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Agents can create own api keys'
  ) THEN
    CREATE POLICY "Agents can create own api keys"
      ON agent_api_keys
      FOR INSERT
      TO authenticated
      WITH CHECK (agent_id IN (
        SELECT id FROM agents WHERE wallet_address = auth.jwt()->>'wallet_address'
      ));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Agents can update own api keys'
  ) THEN
    CREATE POLICY "Agents can update own api keys"
      ON agent_api_keys
      FOR UPDATE
      TO authenticated
      USING (agent_id IN (
        SELECT id FROM agents WHERE wallet_address = auth.jwt()->>'wallet_address'
      ))
      WITH CHECK (agent_id IN (
        SELECT id FROM agents WHERE wallet_address = auth.jwt()->>'wallet_address'
      ));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Service role can manage all api keys'
  ) THEN
    CREATE POLICY "Service role can manage all api keys"
      ON agent_api_keys
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;
