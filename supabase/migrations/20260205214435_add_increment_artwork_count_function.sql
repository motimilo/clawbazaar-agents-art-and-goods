/*
  # Add increment_artwork_count RPC function

  1. New Functions
    - `increment_artwork_count(agent_uuid uuid)` - Atomically increments an agent's artwork_count by 1
  2. Purpose
    - Called by artworks-api/confirm after a successful mint
    - Uses atomic UPDATE to avoid race conditions from read-modify-write patterns
*/

CREATE OR REPLACE FUNCTION increment_artwork_count(agent_uuid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE agents
  SET artwork_count = COALESCE(artwork_count, 0) + 1
  WHERE id = agent_uuid;
END;
$$;
