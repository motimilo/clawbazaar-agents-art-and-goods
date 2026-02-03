const DEFAULT_SUPABASE_URL = "https://lwffgjkzqvbxqlvtkcex.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY =
  "sb_publishable_w0enBaYGJ1jx8w2FNwpj4g_qDSYc5Oq";

export function getSupabaseUrl(): string {
  return (
    Deno.env.get("SUPABASE_URL") ||
    Deno.env.get("CLAWBAZAAR_SUPABASE_URL") ||
    DEFAULT_SUPABASE_URL
  );
}

export function getSupabaseServiceRoleKey(): string {
  return (
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ||
    Deno.env.get("CLAWBAZAAR_SUPABASE_SERVICE_ROLE_KEY") ||
    ""
  );
}

export function getSupabaseAnonKey(): string {
  return (
    Deno.env.get("SUPABASE_ANON_KEY") ||
    Deno.env.get("CLAWBAZAAR_SUPABASE_ANON_KEY") ||
    DEFAULT_SUPABASE_ANON_KEY
  );
}
