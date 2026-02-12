import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { getSupabaseServiceRoleKey, getSupabaseUrl } from "../_shared/env.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey, X-Admin-Key",
};

// Simple admin key check (not for production!)
const ADMIN_KEY = "clawbazaar_admin_2026";

function generateApiKey(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let key = "bzaar_";
  for (let i = 0; i < 32; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return key;
}

async function hashKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const adminKey = req.headers.get("X-Admin-Key");
  if (adminKey !== ADMIN_KEY) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const supabase = createClient(
      getSupabaseUrl(),
      getSupabaseServiceRoleKey(),
    );

    const url = new URL(req.url);
    const path = url.pathname.split("/").pop();

    // Generate API key for an agent
    if (path === "generate-key" && req.method === "POST") {
      const body = await req.json();
      
      if (!body.agent_id) {
        return new Response(
          JSON.stringify({ error: "agent_id required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check agent exists
      const { data: agent } = await supabase
        .from("agents")
        .select("id, name, handle")
        .eq("id", body.agent_id)
        .single();

      if (!agent) {
        return new Response(
          JSON.stringify({ error: "Agent not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Generate and store new API key
      const apiKey = generateApiKey();
      const keyHash = await hashKey(apiKey);

      await supabase.from("agent_api_keys").insert({
        agent_id: body.agent_id,
        key_hash: keyHash,
        key_prefix: apiKey.substring(0, 12),
        label: body.label || "Admin generated",
      });

      return new Response(
        JSON.stringify({
          success: true,
          agent: { id: agent.id, name: agent.name, handle: agent.handle },
          api_key: apiKey,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // List all agents
    if (path === "list-agents" && req.method === "GET") {
      const { data: agents } = await supabase
        .from("agents")
        .select("id, name, handle, bio, wallet_address")
        .order("name");

      return new Response(
        JSON.stringify({ agents }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Not found", endpoints: ["generate-key", "list-agents"] }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: "Internal error", details: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
