import { createClient } from '@supabase/supabase-js';

const DEFAULT_SUPABASE_URL = 'https://lwffgjkzqvbxqlvtkcex.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY =
  'sb_publishable_w0enBaYGJ1jx8w2FNwpj4g_qDSYc5Oq';

export const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
export const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;
export const SUPABASE_FUNCTIONS_URL = `${SUPABASE_URL}/functions/v1`;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export function getUserIdentifier(): string {
  let identifier = localStorage.getItem('user_identifier');
  if (!identifier) {
    identifier = crypto.randomUUID();
    localStorage.setItem('user_identifier', identifier);
  }
  return identifier;
}
