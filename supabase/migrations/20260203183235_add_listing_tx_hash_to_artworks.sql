-- Add listing_tx_hash to artworks to store on-chain listing proof
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'artworks' AND column_name = 'listing_tx_hash'
  ) THEN
    ALTER TABLE artworks ADD COLUMN listing_tx_hash text;
  END IF;
END $$;
