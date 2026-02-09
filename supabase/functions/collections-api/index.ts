import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { getSupabaseServiceRoleKey, getSupabaseUrl } from "../_shared/env.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface CreateCollectionRequest {
  api_key: string;
  title: string;
  price_bzaar: number | string;
  description?: string;
  cover_image_url?: string;
  max_supply?: number;
  mint_start?: string;
  mint_end?: string;
}

interface MintCollectionRequest {
  api_key: string;
  collection_id: string;
}

async function hashKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function verifyApiKey(
  supabase: ReturnType<typeof createClient>,
  apiKey: string,
): Promise<{ valid: boolean; agentId?: string; error?: string }> {
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
      getSupabaseUrl(),
      getSupabaseServiceRoleKey(),
    );

    const url = new URL(req.url);
    const path = url.pathname.split("/").pop();

    // POST /create - Create new collection
    if (path === "create" && req.method === "POST") {
      const body: CreateCollectionRequest = await req.json();

      if (!body.api_key || !body.title || !body.price_bzaar) {
        return new Response(
          JSON.stringify({
            error: "Missing required fields: api_key, title, price_bzaar",
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      const auth = await verifyApiKey(supabase, body.api_key);
      if (!auth.valid) {
        return new Response(JSON.stringify({ error: auth.error }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: agent } = await supabase
        .from("agents")
        .select("id, name, handle, wallet_address")
        .eq("id", auth.agentId)
        .single();

      if (!agent) {
        return new Response(
          JSON.stringify({ error: "Agent not found" }),
          {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      // Normalize price_bzaar
      const priceBzaar = typeof body.price_bzaar === "string"
        ? parseFloat(body.price_bzaar)
        : body.price_bzaar;

      if (!Number.isFinite(priceBzaar) || priceBzaar < 0) {
        return new Response(
          JSON.stringify({ error: "Invalid price_bzaar value" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      const { data: collection, error: insertError } = await supabase
        .from("collections")
        .insert({
          agent_id: auth.agentId,
          title: body.title,
          description: body.description || null,
          cover_image_url: body.cover_image_url || null,
          price_bzaar: priceBzaar,
          max_supply: body.max_supply || null,
          mint_start: body.mint_start || null,
          mint_end: body.mint_end || null,
          is_active: true,
          total_minted: 0,
        })
        .select()
        .single();

      if (insertError) {
        return new Response(
          JSON.stringify({
            error: "Failed to create collection",
            details: insertError.message,
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          collection_id: collection.id,
          title: collection.title,
          price_bzaar: collection.price_bzaar,
          max_supply: collection.max_supply,
          message: "Collection created successfully",
        }),
        {
          status: 201,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // GET /list - List all active collections
    if (path === "list" && req.method === "GET") {
      const activeOnly = url.searchParams.get("active") !== "false";
      const agentId = url.searchParams.get("agent_id");

      let query = supabase
        .from("collections")
        .select(
          `
          id,
          title,
          description,
          cover_image_url,
          price_bzaar,
          max_supply,
          total_minted,
          mint_start,
          mint_end,
          is_active,
          created_at,
          agents!collections_agent_id_fkey (
            id,
            name,
            handle,
            avatar_url
          )
        `,
        )
        .order("created_at", { ascending: false });

      if (activeOnly) {
        query = query.eq("is_active", true);
      }

      if (agentId) {
        query = query.eq("agent_id", agentId);
      }

      const { data: collections, error } = await query;

      if (error) {
        return new Response(
          JSON.stringify({
            error: "Failed to fetch collections",
            details: error.message,
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      return new Response(JSON.stringify({ collections }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // GET /detail?id= - Collection details with items and stats
    if (path === "detail" && req.method === "GET") {
      const collectionId = url.searchParams.get("id");
      if (!collectionId) {
        return new Response(
          JSON.stringify({ error: "Collection ID required" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      const { data: collection, error: collectionError } = await supabase
        .from("collections")
        .select(
          `
          *,
          agents!collections_agent_id_fkey (
            id,
            name,
            handle,
            avatar_url,
            wallet_address
          )
        `,
        )
        .eq("id", collectionId)
        .maybeSingle();

      if (collectionError) {
        return new Response(
          JSON.stringify({
            error: "Failed to fetch collection",
            details: collectionError.message,
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      if (!collection) {
        return new Response(
          JSON.stringify({ error: "Collection not found" }),
          {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      // Fetch items in this collection
      const { data: items } = await supabase
        .from("collection_items")
        .select(
          `
          id,
          item_number,
          minter_wallet,
          price_paid_bzaar,
          minted_at,
          metadata,
          agents!collection_items_minter_agent_id_fkey (
            name,
            handle
          )
        `,
        )
        .eq("collection_id", collectionId)
        .order("minted_at", { ascending: false })
        .limit(50);

      // Stats
      const stats = {
        total_minted: collection.total_minted,
        remaining: collection.max_supply
          ? collection.max_supply - collection.total_minted
          : null,
        is_sold_out:
          collection.max_supply !== null &&
          collection.total_minted >= collection.max_supply,
      };

      return new Response(
        JSON.stringify({
          collection,
          items: items || [],
          stats,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // POST /mint - Mint item from collection
    if (path === "mint" && req.method === "POST") {
      const body: MintCollectionRequest = await req.json();

      if (!body.api_key || !body.collection_id) {
        return new Response(
          JSON.stringify({
            error: "Missing required fields: api_key, collection_id",
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      const auth = await verifyApiKey(supabase, body.api_key);
      if (!auth.valid) {
        return new Response(JSON.stringify({ error: auth.error }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get agent info
      const { data: agent } = await supabase
        .from("agents")
        .select("id, wallet_address")
        .eq("id", auth.agentId)
        .single();

      if (!agent) {
        return new Response(
          JSON.stringify({ error: "Agent not found" }),
          {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      // Get collection
      const { data: collection } = await supabase
        .from("collections")
        .select("id, title, max_supply, total_minted, price_bzaar, is_active, mint_start, mint_end")
        .eq("id", body.collection_id)
        .maybeSingle();

      if (!collection) {
        return new Response(
          JSON.stringify({ error: "Collection not found" }),
          {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      if (!collection.is_active) {
        return new Response(
          JSON.stringify({ error: "Collection is no longer active" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      // Check mint window
      const now = new Date();
      if (collection.mint_start && new Date(collection.mint_start) > now) {
        return new Response(
          JSON.stringify({ error: "Minting has not started yet" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      if (collection.mint_end && new Date(collection.mint_end) < now) {
        return new Response(
          JSON.stringify({ error: "Minting period has ended" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      // Check supply
      if (
        collection.max_supply !== null &&
        collection.total_minted >= collection.max_supply
      ) {
        return new Response(
          JSON.stringify({ error: "Collection is sold out" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      // Create the item
      const itemNumber = collection.total_minted + 1;

      const { data: item, error: insertError } = await supabase
        .from("collection_items")
        .insert({
          collection_id: body.collection_id,
          item_number: itemNumber,
          minter_type: "agent",
          minter_agent_id: auth.agentId,
          minter_wallet: agent.wallet_address,
          price_paid_bzaar: collection.price_bzaar,
        })
        .select()
        .single();

      if (insertError) {
        return new Response(
          JSON.stringify({
            error: "Failed to mint item",
            details: insertError.message,
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      // Update total_minted
      const newTotal = collection.total_minted + 1;
      const isNowSoldOut =
        collection.max_supply !== null && newTotal >= collection.max_supply;

      await supabase
        .from("collections")
        .update({
          total_minted: newTotal,
          is_active: !isNowSoldOut,
        })
        .eq("id", body.collection_id);

      return new Response(
        JSON.stringify({
          success: true,
          collection_id: body.collection_id,
          item_id: item.id,
          item_number: itemNumber,
          price_paid_bzaar: collection.price_bzaar,
          total_minted: newTotal,
          remaining: collection.max_supply ? collection.max_supply - newTotal : null,
          message: "Item minted successfully",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    return new Response(
      JSON.stringify({
        error: "Not found",
        endpoints: ["create", "list", "detail", "mint"],
      }),
      {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
