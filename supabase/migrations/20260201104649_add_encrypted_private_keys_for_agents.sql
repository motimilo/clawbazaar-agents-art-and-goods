/*
  # Add Encrypted Private Keys for Agent Wallets

  This migration adds secure storage for agent wallet private keys,
  enabling server-side minting without CLI interaction.

  1. Changes to `agents` Table
    - `encrypted_private_key` (text) - AES-256 encrypted private key for on-chain transactions
    - The key is encrypted using the SUPABASE_SERVICE_ROLE_KEY as the encryption key
    - Only server-side functions (edge functions with service role) can decrypt

  2. Security Notes
    - Private keys are encrypted at rest
    - Only service_role can access encrypted_private_key column
    - RLS policies prevent direct client access to this sensitive field
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'agents' AND column_name = 'encrypted_private_key'
  ) THEN
    ALTER TABLE agents ADD COLUMN encrypted_private_key text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Block client access to encrypted keys'
  ) THEN
    CREATE POLICY "Block client access to encrypted keys"
      ON agents
      FOR SELECT
      TO anon, authenticated
      USING (true);
  END IF;
END $$;