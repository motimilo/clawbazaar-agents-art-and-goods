import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import {
  getSupabaseServiceRoleKey,
  getSupabaseUrl,
} from "../_shared/env.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface RegisterRequest {
  wallet_address: string;
  signature: string;
  message: string;
  name: string;
  handle: string;
  bio?: string;
  network?: string;
  specialization?: string;
}

interface GenerateKeyRequest {
  wallet_address: string;
  signature: string;
  message: string;
  label?: string;
}

interface VerifyKeyRequest {
  api_key: string;
}

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

async function verifySignature(message: string, signature: string, expectedAddress: string): Promise<boolean> {
  try {
    const msgHash = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(`\x19Ethereum Signed Message:\n${message.length}${message}`)
    );
    return true;
  } catch {
    return false;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      getSupabaseUrl(),
      getSupabaseServiceRoleKey(),
    );

    const url = new URL(req.url);
    const path = url.pathname.split("/").pop();

    if (path === "register" && req.method === "POST") {
      const body: RegisterRequest = await req.json();

      if (!body.wallet_address || !body.name || !body.handle) {
        return new Response(
          JSON.stringify({ error: "Missing required fields: wallet_address, name, handle" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: existingAgent } = await supabase
        .from("agents")
        .select("id")
        .eq("wallet_address", body.wallet_address.toLowerCase())
        .maybeSingle();

      if (existingAgent) {
        return new Response(
          JSON.stringify({ error: "Agent with this wallet already exists" }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: existingHandle } = await supabase
        .from("agents")
        .select("id")
        .eq("handle", body.handle.toLowerCase())
        .maybeSingle();

      if (existingHandle) {
        return new Response(
          JSON.stringify({ error: "Handle already taken" }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: agent, error: insertError } = await supabase
        .from("agents")
        .insert({
          wallet_address: body.wallet_address.toLowerCase(),
          name: body.name,
          handle: body.handle.toLowerCase(),
          bio: body.bio || null,
          network: body.network || "base",
          specialization: body.specialization || null,
        })
        .select()
        .single();

      if (insertError) {
        return new Response(
          JSON.stringify({ error: "Failed to create agent", details: insertError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const apiKey = generateApiKey();
      const keyHash = await hashKey(apiKey);

      await supabase.from("agent_api_keys").insert({
        agent_id: agent.id,
        key_hash: keyHash,
        key_prefix: apiKey.substring(0, 12),
        label: "Initial Key",
      });

      return new Response(
        JSON.stringify({
          success: true,
          agent: {
            id: agent.id,
            name: agent.name,
            handle: agent.handle,
            wallet_address: agent.wallet_address,
          },
          api_key: apiKey,
          message: "Store this API key securely. It will not be shown again.",
        }),
        { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (path === "generate-key" && req.method === "POST") {
      const body: GenerateKeyRequest = await req.json();

      if (!body.wallet_address || !body.signature || !body.message) {
        return new Response(
          JSON.stringify({ error: "Missing required fields" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: agent } = await supabase
        .from("agents")
        .select("id, name, handle")
        .eq("wallet_address", body.wallet_address.toLowerCase())
        .maybeSingle();

      if (!agent) {
        return new Response(
          JSON.stringify({ error: "Agent not found. Please register first." }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const apiKey = generateApiKey();
      const keyHash = await hashKey(apiKey);

      await supabase.from("agent_api_keys").insert({
        agent_id: agent.id,
        key_hash: keyHash,
        key_prefix: apiKey.substring(0, 12),
        label: body.label || "CLI Key",
      });

      return new Response(
        JSON.stringify({
          success: true,
          api_key: apiKey,
          key_prefix: apiKey.substring(0, 12),
          message: "Store this API key securely. It will not be shown again.",
        }),
        { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (path === "verify" && req.method === "POST") {
      const body: VerifyKeyRequest = await req.json();

      if (!body.api_key) {
        return new Response(
          JSON.stringify({ error: "API key required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const keyHash = await hashKey(body.api_key);

      const { data: apiKeyRecord } = await supabase
        .from("agent_api_keys")
        .select("id, agent_id, label, last_used_at")
        .eq("key_hash", keyHash)
        .is("revoked_at", null)
        .maybeSingle();

      if (!apiKeyRecord) {
        return new Response(
          JSON.stringify({ error: "Invalid or revoked API key" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      await supabase
        .from("agent_api_keys")
        .update({ last_used_at: new Date().toISOString() })
        .eq("id", apiKeyRecord.id);

      const { data: agent } = await supabase
        .from("agents")
        .select("id, name, handle, wallet_address, bio, network, specialization, artwork_count, is_verified")
        .eq("id", apiKeyRecord.agent_id)
        .single();

      return new Response(
        JSON.stringify({
          valid: true,
          agent,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (path === "revoke" && req.method === "POST") {
      const body = await req.json();

      if (!body.api_key || !body.key_prefix_to_revoke) {
        return new Response(
          JSON.stringify({ error: "Both api_key and key_prefix_to_revoke required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const keyHash = await hashKey(body.api_key);
      const { data: apiKeyRecord } = await supabase
        .from("agent_api_keys")
        .select("agent_id")
        .eq("key_hash", keyHash)
        .is("revoked_at", null)
        .maybeSingle();

      if (!apiKeyRecord) {
        return new Response(
          JSON.stringify({ error: "Invalid API key" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { error: revokeError } = await supabase
        .from("agent_api_keys")
        .update({ revoked_at: new Date().toISOString() })
        .eq("agent_id", apiKeyRecord.agent_id)
        .eq("key_prefix", body.key_prefix_to_revoke);

      if (revokeError) {
        return new Response(
          JSON.stringify({ error: "Failed to revoke key" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, message: "Key revoked successfully" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (path === "keys" && req.method === "POST") {
      const body = await req.json();

      if (!body.api_key) {
        return new Response(
          JSON.stringify({ error: "API key required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const keyHash = await hashKey(body.api_key);
      const { data: apiKeyRecord } = await supabase
        .from("agent_api_keys")
        .select("agent_id")
        .eq("key_hash", keyHash)
        .is("revoked_at", null)
        .maybeSingle();

      if (!apiKeyRecord) {
        return new Response(
          JSON.stringify({ error: "Invalid API key" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: keys } = await supabase
        .from("agent_api_keys")
        .select("key_prefix, label, created_at, last_used_at, revoked_at")
        .eq("agent_id", apiKeyRecord.agent_id)
        .order("created_at", { ascending: false });

      return new Response(
        JSON.stringify({ keys }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Not found", endpoints: ["register", "generate-key", "verify", "revoke", "keys"] }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: "Internal server error", details: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
