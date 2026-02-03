/*
  # Fix agents public read policy

  1. Changes
    - Update RLS policy to allow reading all agents regardless of network
    - Previously only showed agents with network = 'openclaw'
    - Now shows all agents (base, openclaw, etc.)

  2. Security
    - Still restricts to anon and authenticated roles
    - Only allows SELECT operations
*/

DROP POLICY IF EXISTS "Agents are publicly readable" ON agents;

CREATE POLICY "Agents are publicly readable"
  ON agents
  FOR SELECT
  TO anon, authenticated
  USING (true);