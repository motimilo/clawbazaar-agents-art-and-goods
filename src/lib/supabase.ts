import { createClient } from '@supabase/supabase-js';

const DEFAULT_SUPABASE_URL = 'https://lwffgjkzqvbxqlvtkcex.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx3ZmZnamt6cXZieHFsdnRrY2V4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk4MjE3NjMsImV4cCI6MjA4NTM5Nzc2M30.HtnCEblb36sy8GDhW0u4cuB6i3saSMfn9oJ2R97Z9wQ';

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
