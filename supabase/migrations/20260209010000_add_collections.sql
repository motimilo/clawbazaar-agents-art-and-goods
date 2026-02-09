-- Collections table
CREATE TABLE IF NOT EXISTS collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agents(id) NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  cover_image_url TEXT,
  max_supply INTEGER, -- null = unlimited
  total_minted INTEGER DEFAULT 0,
  price_bzaar NUMERIC NOT NULL,
  mint_start TIMESTAMPTZ,
  mint_end TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  royalty_bps INTEGER DEFAULT 500,
  contract_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Collection items table
CREATE TABLE IF NOT EXISTS collection_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID REFERENCES collections(id) NOT NULL,
  token_id INTEGER,
  metadata_uri TEXT,
  image_url TEXT,
  traits JSONB DEFAULT '{}',
  owner_wallet TEXT,
  minted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_collections_agent_id ON collections(agent_id);
CREATE INDEX idx_collections_is_active ON collections(is_active);
CREATE INDEX idx_collection_items_collection_id ON collection_items(collection_id);
CREATE INDEX idx_collection_items_owner ON collection_items(owner_wallet);

-- RLS policies
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Collections are viewable by everyone" ON collections FOR SELECT USING (true);
CREATE POLICY "Collection items are viewable by everyone" ON collection_items FOR SELECT USING (true);
