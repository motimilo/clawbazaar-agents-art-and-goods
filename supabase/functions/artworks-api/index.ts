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

const ALLOWED_NFT_CONTRACT = "0x20d1Ab845aAe08005cEc04A9bdb869A29A2b45FF".toLowerCase();

interface PrepareRequest {
  api_key: string;
  title: string;
  description?: string;
  image_url: string;
  category_slug?: string;
  style?: string;
  generation_prompt?: string;
}

interface ConfirmMintRequest {
  api_key: string;
  artwork_id: string;
  token_id: number;
  tx_hash: string;
  contract_address: string;
  ipfs_metadata_uri: string;
}

interface ListForSaleRequest {
  api_key: string;
  artwork_id: string;
  price_bzaar: number;
}

interface BuyRequest {
  api_key: string;
  artwork_id: string;
  tx_hash: string;
}

interface MarketplaceListingResponse {
  id: string;
  artwork_id: string;
  title: string;
  description: string | null;
  image_url: string;
  price_bzaar: number;
  token_id: number;
  contract_address: string;
  seller_agent: {
    id: string;
    name: string;
    handle: string;
    wallet_address: string;
  };
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
      getSupabaseUrl(),
      getSupabaseServiceRoleKey(),
    );

    const url = new URL(req.url);
    const path = url.pathname.split("/").pop();

    if (path === "prepare" && req.method === "POST") {
      const body: PrepareRequest = await req.json();

      if (!body.api_key || !body.title || !body.image_url) {
        return new Response(
          JSON.stringify({ error: "Missing required fields: api_key, title, image_url" }),
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

      let categoryId = null;
      if (body.category_slug) {
        const { data: category } = await supabase
          .from("categories")
          .select("id")
          .eq("slug", body.category_slug)
          .maybeSingle();
        categoryId = category?.id || null;
      }

      const { data: artwork, error: insertError } = await supabase
        .from("artworks")
        .insert({
          agent_id: auth.agentId,
          title: body.title,
          description: body.description || null,
          image_url: body.image_url,
          category_id: categoryId,
          style: body.style || null,
          generation_prompt: body.generation_prompt || null,
          nft_status: "pending",
          current_owner_type: "agent",
          current_owner_id: auth.agentId,
        })
        .select()
        .single();

      if (insertError) {
        return new Response(
          JSON.stringify({ error: "Failed to create artwork", details: insertError.message }),
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
          ...(body.style ? [{ trait_type: "Style", value: body.style }] : []),
          ...(body.category_slug ? [{ trait_type: "Category", value: body.category_slug }] : []),
        ],
        external_url: `https://clawbazaar.art/artwork/${artwork.id}`,
      };

      return new Response(
        JSON.stringify({
          success: true,
          artwork_id: artwork.id,
          creator_wallet: agent.wallet_address,
          metadata,
          message: "Upload metadata to IPFS, then mint on-chain, then call /confirm with tx details",
        }),
        { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (path === "confirm" && req.method === "POST") {
      const body: ConfirmMintRequest = await req.json();

      if (!body.api_key || !body.artwork_id || body.token_id === undefined || !body.tx_hash || !body.contract_address || !body.ipfs_metadata_uri) {
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

      const { data: artwork } = await supabase
        .from("artworks")
        .select("id, agent_id, nft_status")
        .eq("id", body.artwork_id)
        .maybeSingle();

      if (!artwork) {
        return new Response(
          JSON.stringify({ error: "Artwork not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (artwork.agent_id !== auth.agentId) {
        return new Response(
          JSON.stringify({ error: "Not authorized to update this artwork" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (artwork.nft_status === "minted") {
        return new Response(
          JSON.stringify({ error: "Artwork already minted" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (body.contract_address.toLowerCase() !== ALLOWED_NFT_CONTRACT) {
        return new Response(
          JSON.stringify({ error: "Invalid contract address. Must use the official ClawBazaar NFT contract." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: existingClaim } = await supabase
        .from("artworks")
        .select("id, title")
        .eq("contract_address", body.contract_address)
        .eq("token_id", body.token_id)
        .neq("id", body.artwork_id)
        .maybeSingle();

      if (existingClaim) {
        return new Response(
          JSON.stringify({
            error: `Token ID ${body.token_id} is already claimed by artwork "${existingClaim.title}"`,
            existing_artwork_id: existingClaim.id
          }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { error: updateError } = await supabase
        .from("artworks")
        .update({
          token_id: body.token_id,
          contract_address: body.contract_address,
          mint_tx_hash: body.tx_hash,
          ipfs_metadata_uri: body.ipfs_metadata_uri,
          nft_status: "minted",
        })
        .eq("id", body.artwork_id);

      if (updateError) {
        return new Response(
          JSON.stringify({ error: "Failed to update artwork", details: updateError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      await supabase.rpc("increment_artwork_count", { agent_uuid: auth.agentId });

      return new Response(
        JSON.stringify({
          success: true,
          artwork_id: body.artwork_id,
          token_id: body.token_id,
          message: "Artwork minted successfully",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (path === "list" && req.method === "POST") {
      const body: ListForSaleRequest = await req.json();

      if (!body.api_key || !body.artwork_id || !body.price_bzaar) {
        return new Response(
          JSON.stringify({ error: "Missing required fields: api_key, artwork_id, price_bzaar" }),
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

      const { data: artwork } = await supabase
        .from("artworks")
        .select("id, agent_id, nft_status, token_id, current_owner_id, current_owner_type")
        .eq("id", body.artwork_id)
        .maybeSingle();

      if (!artwork) {
        return new Response(
          JSON.stringify({ error: "Artwork not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (artwork.current_owner_type !== "agent" || artwork.current_owner_id !== auth.agentId) {
        return new Response(
          JSON.stringify({ error: "Not authorized to list this artwork" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (artwork.nft_status !== "minted") {
        return new Response(
          JSON.stringify({ error: "Artwork must be minted before listing" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { error: updateError } = await supabase
        .from("artworks")
        .update({
          is_for_sale: true,
          price_bzaar: body.price_bzaar,
        })
        .eq("id", body.artwork_id);

      if (updateError) {
        return new Response(
          JSON.stringify({ error: "Failed to list artwork" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          artwork_id: body.artwork_id,
          price_bzaar: body.price_bzaar,
          message: "Artwork listed for sale. Remember to call listForSale on the smart contract too.",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (path === "my-artworks" && req.method === "POST") {
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

      const { data: artworks } = await supabase
        .from("artworks")
        .select("id, title, image_url, nft_status, token_id, is_for_sale, price_bzaar, created_at")
        .eq("agent_id", auth.agentId)
        .order("created_at", { ascending: false });

      return new Response(
        JSON.stringify({ artworks }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (path === "categories" && req.method === "GET") {
      const { data: categories } = await supabase
        .from("categories")
        .select("id, name, slug, description")
        .order("name");

      return new Response(
        JSON.stringify({ categories }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (path === "marketplace" && req.method === "GET") {
      const { data: listings } = await supabase
        .from("artworks")
        .select(`
          id,
          title,
          description,
          image_url,
          price_bzaar,
          token_id,
          contract_address,
          agents!artworks_agent_id_fkey (
            id,
            name,
            handle,
            wallet_address
          )
        `)
        .eq("is_for_sale", true)
        .eq("nft_status", "minted")
        .order("created_at", { ascending: false });

      const formattedListings = (listings || []).map((item: any) => ({
        id: item.id,
        artwork_id: item.id,
        title: item.title,
        description: item.description,
        image_url: item.image_url,
        price_bzaar: item.price_bzaar,
        token_id: item.token_id,
        contract_address: item.contract_address,
        seller_agent: item.agents,
      }));

      return new Response(
        JSON.stringify({ listings: formattedListings }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (path === "artwork" && req.method === "GET") {
      const artworkId = url.searchParams.get("id");
      if (!artworkId) {
        return new Response(
          JSON.stringify({ error: "Artwork ID required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: artwork } = await supabase
        .from("artworks")
        .select(`
          id,
          title,
          description,
          image_url,
          price_bzaar,
          token_id,
          contract_address,
          is_for_sale,
          nft_status,
          agents!artworks_agent_id_fkey (
            id,
            name,
            handle,
            wallet_address
          )
        `)
        .eq("id", artworkId)
        .maybeSingle();

      if (!artwork) {
        return new Response(
          JSON.stringify({ error: "Artwork not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          artwork: {
            ...artwork,
            seller_agent: artwork.agents,
          },
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (path === "buy" && req.method === "POST") {
      const body: BuyRequest = await req.json();

      if (!body.api_key || !body.artwork_id || !body.tx_hash) {
        return new Response(
          JSON.stringify({ error: "Missing required fields: api_key, artwork_id, tx_hash" }),
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

      const { data: artwork } = await supabase
        .from("artworks")
        .select(`
          id,
          agent_id,
          current_owner_id,
          current_owner_type,
          title,
          token_id,
          is_for_sale,
          price_bzaar,
          nft_status
        `)
        .eq("id", body.artwork_id)
        .maybeSingle();

      if (!artwork) {
        return new Response(
          JSON.stringify({ error: "Artwork not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!artwork.is_for_sale) {
        return new Response(
          JSON.stringify({ error: "Artwork is not for sale" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (artwork.nft_status !== "minted") {
        return new Response(
          JSON.stringify({ error: "Artwork is not minted" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (artwork.current_owner_type === "agent" && artwork.current_owner_id === auth.agentId) {
        return new Response(
          JSON.stringify({ error: "Cannot buy your own artwork" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: listing } = await supabase
        .from("marketplace_listings")
        .select("id")
        .eq("artwork_id", body.artwork_id)
        .eq("status", "active")
        .maybeSingle();

      const { error: updateError } = await supabase
        .from("artworks")
        .update({
          is_for_sale: false,
          current_owner_type: "agent",
          current_owner_id: auth.agentId,
        })
        .eq("id", body.artwork_id);

      if (updateError) {
        return new Response(
          JSON.stringify({ error: "Failed to update artwork ownership" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (listing) {
        await supabase
          .from("marketplace_listings")
          .update({ status: "sold", sold_at: new Date().toISOString() })
          .eq("id", listing.id);

        await supabase
          .from("marketplace_transactions")
          .insert({
            listing_id: listing.id,
            buyer_type: "agent",
            buyer_agent_id: auth.agentId,
            price_paid: artwork.price_bzaar,
            tx_hash: body.tx_hash,
          });
      }

      await supabase
        .from("nft_transfers")
        .insert({
          artwork_id: body.artwork_id,
          token_id: artwork.token_id,
          from_address: artwork.current_owner_id,
          to_address: auth.agentId,
          tx_hash: body.tx_hash,
        });

      return new Response(
        JSON.stringify({
          success: true,
          artwork_id: body.artwork_id,
          token_id: artwork.token_id,
          price_paid: artwork.price_bzaar,
          message: "Purchase confirmed successfully",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Not found", endpoints: ["prepare", "confirm", "list", "my-artworks", "categories", "marketplace", "artwork", "buy"] }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: "Internal server error", details: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
