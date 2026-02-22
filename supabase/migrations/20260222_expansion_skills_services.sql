/*
  # CLAWBAZAAR Expansion: Skills, Services & Unified Transactions
  
  Migration Date: 2026-02-22
  Authors: PINCH + Marooned
  
  This migration adds support for:
  1. Skills marketplace (SKILL.md packages)
  2. Services marketplace (agent-as-a-service)
  3. Prompts marketplace (prompt templates)
  4. Unified transaction ledger (x402 + $BAZAAR + fiat)
  5. Multi-chain agent wallets
  
  All tables use consistent patterns from existing schema.
*/

-- ============================================================================
-- 1. SKILLS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  
  -- Basic info
  name VARCHAR(255) NOT NULL,
  description TEXT,
  version VARCHAR(50) DEFAULT '1.0.0',
  
  -- Package storage
  package_url TEXT NOT NULL,           -- IPFS or S3 URL
  package_hash VARCHAR(64) NOT NULL,   -- SHA256 for integrity verification
  
  -- Pricing (supports both x402 stablecoins and $BAZAAR)
  price_usdc DECIMAL(10,2),            -- x402 price in USDC
  price_bazaar DECIMAL(18,0),          -- $BAZAAR price (18 decimals)
  
  -- Categorization
  category VARCHAR(100),
  tags TEXT[] DEFAULT '{}',
  
  -- Stats
  downloads INTEGER DEFAULT 0,
  rating DECIMAL(3,2),                 -- 0.00 to 5.00
  
  -- Status
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending', 'rejected')),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for skills
CREATE INDEX IF NOT EXISTS idx_skills_creator_id ON skills(creator_id);
CREATE INDEX IF NOT EXISTS idx_skills_category ON skills(category);
CREATE INDEX IF NOT EXISTS idx_skills_status ON skills(status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_skills_downloads ON skills(downloads DESC);
CREATE INDEX IF NOT EXISTS idx_skills_rating ON skills(rating DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_skills_created_at ON skills(created_at DESC);

-- RLS for skills
ALTER TABLE skills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Skills are publicly readable"
  ON skills FOR SELECT
  TO anon, authenticated
  USING (status = 'active');

CREATE POLICY "Creators can view all their skills"
  ON skills FOR SELECT
  TO authenticated
  USING (creator_id IN (
    SELECT id FROM agents WHERE wallet_address = (select auth.jwt())->>'wallet_address'
  ));

CREATE POLICY "Creators can create skills"
  ON skills FOR INSERT
  TO authenticated
  WITH CHECK (creator_id IN (
    SELECT id FROM agents WHERE wallet_address = (select auth.jwt())->>'wallet_address'
  ));

CREATE POLICY "Creators can update their skills"
  ON skills FOR UPDATE
  TO authenticated
  USING (creator_id IN (
    SELECT id FROM agents WHERE wallet_address = (select auth.jwt())->>'wallet_address'
  ))
  WITH CHECK (creator_id IN (
    SELECT id FROM agents WHERE wallet_address = (select auth.jwt())->>'wallet_address'
  ));

CREATE POLICY "Service role has full access to skills"
  ON skills FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- 2. SERVICES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  
  -- Basic info
  name VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Service endpoint
  endpoint_url TEXT NOT NULL,          -- Where to call the service
  
  -- Pricing (per call)
  price_per_call_usdc DECIMAL(10,4),   -- x402 micropayment per call
  price_per_call_bazaar DECIMAL(18,0), -- $BAZAAR per call
  
  -- API schema (for documentation and validation)
  input_schema JSONB DEFAULT '{}',     -- Expected input format
  output_schema JSONB DEFAULT '{}',    -- Expected output format
  
  -- Stats
  avg_response_time_ms INTEGER,
  success_rate DECIMAL(5,2),           -- 0.00 to 100.00
  total_calls INTEGER DEFAULT 0,
  
  -- Status
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending', 'rejected')),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for services
CREATE INDEX IF NOT EXISTS idx_services_provider_id ON services(provider_id);
CREATE INDEX IF NOT EXISTS idx_services_status ON services(status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_services_total_calls ON services(total_calls DESC);
CREATE INDEX IF NOT EXISTS idx_services_success_rate ON services(success_rate DESC NULLS LAST);

-- RLS for services
ALTER TABLE services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Services are publicly readable"
  ON services FOR SELECT
  TO anon, authenticated
  USING (status = 'active');

CREATE POLICY "Providers can view all their services"
  ON services FOR SELECT
  TO authenticated
  USING (provider_id IN (
    SELECT id FROM agents WHERE wallet_address = (select auth.jwt())->>'wallet_address'
  ));

CREATE POLICY "Providers can create services"
  ON services FOR INSERT
  TO authenticated
  WITH CHECK (provider_id IN (
    SELECT id FROM agents WHERE wallet_address = (select auth.jwt())->>'wallet_address'
  ));

CREATE POLICY "Providers can update their services"
  ON services FOR UPDATE
  TO authenticated
  USING (provider_id IN (
    SELECT id FROM agents WHERE wallet_address = (select auth.jwt())->>'wallet_address'
  ))
  WITH CHECK (provider_id IN (
    SELECT id FROM agents WHERE wallet_address = (select auth.jwt())->>'wallet_address'
  ));

CREATE POLICY "Service role has full access to services"
  ON services FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- 3. PROMPTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  
  -- Basic info
  name VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Prompt content
  prompt_text TEXT NOT NULL,
  model_target VARCHAR(100),           -- claude, gpt4, flux, midjourney, etc
  
  -- Categorization
  category VARCHAR(100),
  
  -- Pricing
  price_usdc DECIMAL(10,2),
  price_bazaar DECIMAL(18,0),
  
  -- Stats
  uses INTEGER DEFAULT 0,
  rating DECIMAL(3,2),
  
  -- Status
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending', 'rejected')),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for prompts
CREATE INDEX IF NOT EXISTS idx_prompts_creator_id ON prompts(creator_id);
CREATE INDEX IF NOT EXISTS idx_prompts_model_target ON prompts(model_target);
CREATE INDEX IF NOT EXISTS idx_prompts_category ON prompts(category);
CREATE INDEX IF NOT EXISTS idx_prompts_status ON prompts(status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_prompts_uses ON prompts(uses DESC);

-- RLS for prompts
ALTER TABLE prompts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Prompts are publicly readable"
  ON prompts FOR SELECT
  TO anon, authenticated
  USING (status = 'active');

CREATE POLICY "Creators can manage their prompts"
  ON prompts FOR ALL
  TO authenticated
  USING (creator_id IN (
    SELECT id FROM agents WHERE wallet_address = (select auth.jwt())->>'wallet_address'
  ))
  WITH CHECK (creator_id IN (
    SELECT id FROM agents WHERE wallet_address = (select auth.jwt())->>'wallet_address'
  ));

CREATE POLICY "Service role has full access to prompts"
  ON prompts FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- 4. UNIFIED TRANSACTIONS LEDGER
-- ============================================================================

CREATE TABLE IF NOT EXISTS unified_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Product reference
  product_type VARCHAR(50) NOT NULL CHECK (product_type IN ('art', 'edition', 'skill', 'service', 'prompt')),
  product_id UUID NOT NULL,
  
  -- Parties
  buyer_id UUID,                        -- Can be null for anonymous x402 payments
  buyer_wallet VARCHAR(66),             -- Wallet address if known
  seller_id UUID NOT NULL REFERENCES agents(id),
  
  -- Payment details
  payment_method VARCHAR(50) NOT NULL CHECK (payment_method IN ('x402', 'bazaar', 'fiat')),
  amount DECIMAL(18,6) NOT NULL,
  currency VARCHAR(10) NOT NULL,        -- USDC, BAZAAR, USD
  
  -- On-chain proof (if applicable)
  tx_hash VARCHAR(66),                  -- Blockchain tx hash
  chain VARCHAR(50),                    -- base, ethereum, solana
  
  -- x402 specific
  x402_receipt JSONB,                   -- Full x402 payment proof
  
  -- Fee breakdown
  platform_fee DECIMAL(18,6),
  creator_royalty DECIMAL(18,6),
  
  -- Status
  status VARCHAR(50) DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for transactions
CREATE INDEX IF NOT EXISTS idx_unified_tx_product ON unified_transactions(product_type, product_id);
CREATE INDEX IF NOT EXISTS idx_unified_tx_buyer ON unified_transactions(buyer_id) WHERE buyer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_unified_tx_seller ON unified_transactions(seller_id);
CREATE INDEX IF NOT EXISTS idx_unified_tx_payment_method ON unified_transactions(payment_method);
CREATE INDEX IF NOT EXISTS idx_unified_tx_status ON unified_transactions(status);
CREATE INDEX IF NOT EXISTS idx_unified_tx_created_at ON unified_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_unified_tx_tx_hash ON unified_transactions(tx_hash) WHERE tx_hash IS NOT NULL;

-- RLS for transactions
ALTER TABLE unified_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Transactions are publicly readable"
  ON unified_transactions FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Service role can create transactions"
  ON unified_transactions FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can update transactions"
  ON unified_transactions FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- 5. AGENT WALLETS (MULTI-CHAIN SUPPORT)
-- ============================================================================

CREATE TABLE IF NOT EXISTS agent_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  
  -- Chain info
  chain VARCHAR(50) NOT NULL,           -- base, ethereum, solana, etc
  address VARCHAR(66) NOT NULL,
  
  -- Flags
  is_primary BOOLEAN DEFAULT false,
  is_verified BOOLEAN DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(agent_id, chain, address)
);

-- Indexes for agent wallets
CREATE INDEX IF NOT EXISTS idx_agent_wallets_agent_id ON agent_wallets(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_wallets_chain ON agent_wallets(chain);
CREATE INDEX IF NOT EXISTS idx_agent_wallets_address ON agent_wallets(address);
CREATE INDEX IF NOT EXISTS idx_agent_wallets_primary ON agent_wallets(agent_id) WHERE is_primary = true;

-- RLS for agent wallets
ALTER TABLE agent_wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agent wallets are publicly readable"
  ON agent_wallets FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Agents can manage their wallets"
  ON agent_wallets FOR ALL
  TO authenticated
  USING (agent_id IN (
    SELECT id FROM agents WHERE wallet_address = (select auth.jwt())->>'wallet_address'
  ))
  WITH CHECK (agent_id IN (
    SELECT id FROM agents WHERE wallet_address = (select auth.jwt())->>'wallet_address'
  ));

CREATE POLICY "Service role has full access to agent wallets"
  ON agent_wallets FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- 6. HELPER FUNCTIONS
-- ============================================================================

-- Function to increment skill downloads
CREATE OR REPLACE FUNCTION increment_skill_downloads(skill_uuid UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE skills
  SET downloads = COALESCE(downloads, 0) + 1,
      updated_at = NOW()
  WHERE id = skill_uuid;
END;
$$;

-- Function to increment service calls
CREATE OR REPLACE FUNCTION increment_service_calls(service_uuid UUID, response_time_ms INTEGER, was_successful BOOLEAN)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_calls INTEGER;
  current_success_rate DECIMAL;
  current_avg_time INTEGER;
BEGIN
  SELECT total_calls, success_rate, avg_response_time_ms
  INTO current_calls, current_success_rate, current_avg_time
  FROM services WHERE id = service_uuid;
  
  UPDATE services
  SET 
    total_calls = COALESCE(current_calls, 0) + 1,
    avg_response_time_ms = CASE 
      WHEN current_avg_time IS NULL THEN response_time_ms
      ELSE ((current_avg_time * current_calls) + response_time_ms) / (current_calls + 1)
    END,
    success_rate = CASE
      WHEN current_success_rate IS NULL THEN (CASE WHEN was_successful THEN 100.0 ELSE 0.0 END)
      ELSE ((current_success_rate * current_calls) + (CASE WHEN was_successful THEN 100.0 ELSE 0.0 END)) / (current_calls + 1)
    END,
    updated_at = NOW()
  WHERE id = service_uuid;
END;
$$;

-- Function to increment prompt uses
CREATE OR REPLACE FUNCTION increment_prompt_uses(prompt_uuid UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE prompts
  SET uses = COALESCE(uses, 0) + 1,
      updated_at = NOW()
  WHERE id = prompt_uuid;
END;
$$;

-- ============================================================================
-- 7. SEED DATA (OPTIONAL - CATEGORIES)
-- ============================================================================

-- Insert skill categories if not exists
INSERT INTO skills (id, creator_id, name, description, version, package_url, package_hash, price_usdc, category, status)
SELECT gen_random_uuid(), 
       (SELECT id FROM agents WHERE handle = 'pinch0x' LIMIT 1),
       'Sample Skill',
       'A sample skill to demonstrate the marketplace',
       '1.0.0',
       'https://example.com/skill.md',
       'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
       0.00,
       'demo',
       'inactive'
WHERE NOT EXISTS (SELECT 1 FROM skills LIMIT 1)
AND EXISTS (SELECT 1 FROM agents WHERE handle = 'pinch0x');
