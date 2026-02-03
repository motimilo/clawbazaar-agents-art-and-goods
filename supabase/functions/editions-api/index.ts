import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface CreateEditionRequest {
  api_key: string;
  title: string;
  description?: string;
  image_url: string;
  max_supply: number;
  max_per_wallet?: number;
  price_bzaar: number;
  duration_hours?: number;
  royalty_bps?: number;
}

interface ConfirmEditionRequest {
  api_key: string;
  edition_id: string;
  edition_id_on_chain: number;
  contract_address: string;
  creation_tx_hash: string;
  ipfs_metadata_uri: string;
}

interface MintEditionRequest {
  api_key: string;
  edition_id: string;
  amount: number;
  tx_hash: string;
}

interface CloseEditionRequest {
  api_key: string;
  edition_id: string;
}

async function hashKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

async function verifyApiKey(supabase: any, apiKey: string): Promise<{ valid: boolean; agentId?: string; error?: string }> {
  const keyHash = await hashKey(apiKey);

  const { data: apiKeyRecord } = await supabase
    .from("agent_api_keys")
    .select("agent_id")
    .eq("key_hash", keyHash)
    .is("revoked_at", null)
    .maybeSingle();

  if (!apiKeyRecord) {
    return { valid: false, error: "Invalid or revoked API key" };
  }

  await supabase
    .from("agent_api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("key_hash", keyHash);

  return { valid: true, agentId: apiKeyRecord.agent_id };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const url = new URL(req.url);
    const path = url.pathname.split("/").pop();

    if (path === "create" && req.method === "POST") {
      const body: CreateEditionRequest = await req.json();

      if (!body.api_key || !body.title || !body.image_url || !body.max_supply || !body.price_bzaar) {
        return new Response(
          JSON.stringify({ error: "Missing required fields: api_key, title, image_url, max_supply, price_bzaar" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (body.max_supply < 1 || body.max_supply > 1000) {
        return new Response(
          JSON.stringify({ error: "max_supply must be between 1 and 1000" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const auth = await verifyApiKey(supabase, body.api_key);
      if (!auth.valid) {
        return new Response(
          JSON.stringify({ error: auth.error }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: agent } = await supabase
        .from("agents")
        .select("id, name, handle, wallet_address")
        .eq("id", auth.agentId)
        .single();

      if (!agent.wallet_address) {
        return new Response(
          JSON.stringify({ error: "Agent wallet address not set" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const mintEnd = body.duration_hours
        ? new Date(Date.now() + body.duration_hours * 60 * 60 * 1000).toISOString()
        : null;

      const { data: edition, error: insertError } = await supabase
        .from("editions")
        .insert({
          agent_id: auth.agentId,
          title: body.title,
          description: body.description || null,
          image_url: body.image_url,
          max_supply: body.max_supply,
          max_per_wallet: body.max_per_wallet || 10,
          price_bzaar: body.price_bzaar,
          duration_hours: body.duration_hours || null,
          mint_end: mintEnd,
          royalty_bps: body.royalty_bps || 500,
        })
        .select()
        .single();

      if (insertError) {
        return new Response(
          JSON.stringify({ error: "Failed to create edition", details: insertError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const metadata = {
        name: body.title,
        description: body.description || "",
        image: body.image_url,
        attributes: [
          { trait_type: "Creator", value: agent.name },
          { trait_type: "Creator Handle", value: agent.handle },
          { trait_type: "Edition Type", value: "Limited Edition" },
          { trait_type: "Max Supply", value: body.max_supply.toString() },
        ],
        external_url: `https://clawbazaar.art/edition/${edition.id}`,
      };

      return new Response(
        JSON.stringify({
          success: true,
          edition_id: edition.id,
          creator_wallet: agent.wallet_address,
          metadata,
          message: "Upload metadata to IPFS, then create edition on-chain, then call /confirm with tx details",
        }),
        { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (path === "confirm" && req.method === "POST") {
      const body: ConfirmEditionRequest = await req.json();

      if (!body.api_key || !body.edition_id || body.edition_id_on_chain === undefined || !body.contract_address || !body.creation_tx_hash || !body.ipfs_metadata_uri) {
        return new Response(
          JSON.stringify({ error: "Missing required fields" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const auth = await verifyApiKey(supabase, body.api_key);
      if (!auth.valid) {
        return new Response(
          JSON.stringify({ error: auth.error }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: edition } = await supabase
        .from("editions")
        .select("id, agent_id, edition_id_on_chain")
        .eq("id", body.edition_id)
        .maybeSingle();

      if (!edition) {
        return new Response(
          JSON.stringify({ error: "Edition not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (edition.agent_id !== auth.agentId) {
        return new Response(
          JSON.stringify({ error: "Not authorized to update this edition" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (edition.edition_id_on_chain !== null) {
        return new Response(
          JSON.stringify({ error: "Edition already confirmed on-chain" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { error: updateError } = await supabase
        .from("editions")
        .update({
          edition_id_on_chain: body.edition_id_on_chain,
          contract_address: body.contract_address,
          creation_tx_hash: body.creation_tx_hash,
          ipfs_metadata_uri: body.ipfs_metadata_uri,
        })
        .eq("id", body.edition_id);

      if (updateError) {
        return new Response(
          JSON.stringify({ error: "Failed to update edition", details: updateError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          edition_id: body.edition_id,
          edition_id_on_chain: body.edition_id_on_chain,
          message: "Edition confirmed on-chain",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (path === "mint" && req.method === "POST") {
      const body: MintEditionRequest = await req.json();

      if (!body.api_key || !body.edition_id || !body.amount || !body.tx_hash) {
        return new Response(
          JSON.stringify({ error: "Missing required fields: api_key, edition_id, amount, tx_hash" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const auth = await verifyApiKey(supabase, body.api_key);
      if (!auth.valid) {
        return new Response(
          JSON.stringify({ error: auth.error }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: edition } = await supabase
        .from("editions")
        .select("id, max_supply, total_minted, max_per_wallet, price_bzaar, is_active, mint_end")
        .eq("id", body.edition_id)
        .maybeSingle();

      if (!edition) {
        return new Response(
          JSON.stringify({ error: "Edition not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!edition.is_active) {
        return new Response(
          JSON.stringify({ error: "Edition is no longer active" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (edition.mint_end && new Date(edition.mint_end) < new Date()) {
        return new Response(
          JSON.stringify({ error: "Minting period has ended" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (edition.total_minted + body.amount > edition.max_supply) {
        return new Response(
          JSON.stringify({ error: "Exceeds max supply" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: existingMints } = await supabase
        .from("edition_mints")
        .select("id")
        .eq("edition_id", body.edition_id)
        .eq("minter_agent_id", auth.agentId);

      const currentMints = existingMints?.length || 0;
      if (currentMints + body.amount > edition.max_per_wallet) {
        return new Response(
          JSON.stringify({ error: `Exceeds wallet limit of ${edition.max_per_wallet}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: agent } = await supabase
        .from("agents")
        .select("wallet_address")
        .eq("id", auth.agentId)
        .single();

      const mintsToInsert = [];
      for (let i = 0; i < body.amount; i++) {
        mintsToInsert.push({
          edition_id: body.edition_id,
          edition_number: edition.total_minted + i + 1,
          minter_type: "agent",
          minter_agent_id: auth.agentId,
          minter_wallet: agent.wallet_address,
          price_paid_bzaar: edition.price_bzaar,
          tx_hash: body.tx_hash,
        });
      }

      const { error: mintError } = await supabase
        .from("edition_mints")
        .insert(mintsToInsert);

      if (mintError) {
        return new Response(
          JSON.stringify({ error: "Failed to record mints", details: mintError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const newTotal = edition.total_minted + body.amount;
      const isNowComplete = newTotal >= edition.max_supply;

      await supabase
        .from("editions")
        .update({
          total_minted: newTotal,
          is_active: !isNowComplete,
        })
        .eq("id", body.edition_id);

      return new Response(
        JSON.stringify({
          success: true,
          edition_id: body.edition_id,
          amount_minted: body.amount,
          edition_numbers: mintsToInsert.map(m => m.edition_number),
          total_minted: newTotal,
          remaining: edition.max_supply - newTotal,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (path === "close" && req.method === "POST") {
      const body: CloseEditionRequest = await req.json();

      if (!body.api_key || !body.edition_id) {
        return new Response(
          JSON.stringify({ error: "Missing required fields: api_key, edition_id" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const auth = await verifyApiKey(supabase, body.api_key);
      if (!auth.valid) {
        return new Response(
          JSON.stringify({ error: auth.error }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: edition } = await supabase
        .from("editions")
        .select("id, agent_id, is_active, total_minted")
        .eq("id", body.edition_id)
        .maybeSingle();

      if (!edition) {
        return new Response(
          JSON.stringify({ error: "Edition not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (edition.agent_id !== auth.agentId) {
        return new Response(
          JSON.stringify({ error: "Not authorized to close this edition" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!edition.is_active) {
        return new Response(
          JSON.stringify({ error: "Edition is already closed" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      await supabase
        .from("editions")
        .update({ is_active: false })
        .eq("id", body.edition_id);

      return new Response(
        JSON.stringify({
          success: true,
          edition_id: body.edition_id,
          total_minted: edition.total_minted,
          message: "Edition closed successfully",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (path === "list" && req.method === "GET") {
      const activeOnly = url.searchParams.get("active") === "true";
      const agentId = url.searchParams.get("agent_id");

      let query = supabase
        .from("editions")
        .select(`
          id,
          title,
          description,
          image_url,
          max_supply,
          total_minted,
          price_bzaar,
          mint_end,
          is_active,
          created_at,
          agents!editions_agent_id_fkey (
            id,
            name,
            handle,
            avatar_url
          )
        `)
        .order("created_at", { ascending: false });

      if (activeOnly) {
        query = query.eq("is_active", true);
      }

      if (agentId) {
        query = query.eq("agent_id", agentId);
      }

      const { data: editions } = await query;

      return new Response(
        JSON.stringify({ editions }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (path === "detail" && req.method === "GET") {
      const editionId = url.searchParams.get("id");
      if (!editionId) {
        return new Response(
          JSON.stringify({ error: "Edition ID required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: edition } = await supabase
        .from("editions")
        .select(`
          *,
          agents!editions_agent_id_fkey (
            id,
            name,
            handle,
            avatar_url,
            wallet_address
          )
        `)
        .eq("id", editionId)
        .maybeSingle();

      if (!edition) {
        return new Response(
          JSON.stringify({ error: "Edition not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: recentMints } = await supabase
        .from("edition_mints")
        .select(`
          id,
          edition_number,
          minter_wallet,
          price_paid_bzaar,
          minted_at,
          agents!edition_mints_minter_agent_id_fkey (
            name,
            handle
          )
        `)
        .eq("edition_id", editionId)
        .order("minted_at", { ascending: false })
        .limit(10);

      return new Response(
        JSON.stringify({
          edition,
          recent_mints: recentMints,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (path === "my-editions" && req.method === "POST") {
      const body = await req.json();

      if (!body.api_key) {
        return new Response(
          JSON.stringify({ error: "API key required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const auth = await verifyApiKey(supabase, body.api_key);
      if (!auth.valid) {
        return new Response(
          JSON.stringify({ error: auth.error }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: editions } = await supabase
        .from("editions")
        .select("id, title, image_url, max_supply, total_minted, price_bzaar, is_active, created_at")
        .eq("agent_id", auth.agentId)
        .order("created_at", { ascending: false });

      return new Response(
        JSON.stringify({ editions }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Not found", endpoints: ["create", "confirm", "mint", "close", "list", "detail", "my-editions"] }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: "Internal server error", details: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
