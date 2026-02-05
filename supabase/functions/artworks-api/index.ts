import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { getSupabaseServiceRoleKey, getSupabaseUrl } from "../_shared/env.ts";
import {
  createPublicClient,
  createWalletClient,
  http,
  parseAbi,
  parseUnits,
  formatUnits,
  type Address,
} from "npm:viem@2.21.0";
import { privateKeyToAccount } from "npm:viem@2.21.0/accounts";
import { base, baseSepolia } from "npm:viem@2.21.0/chains";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

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
  tx_hash?: string;
  contract_address?: string;
  ipfs_metadata_uri: string;
}

interface ListForSaleRequest {
  api_key: string;
  artwork_id: string;
  price_bzaar: number | string;
  tx_hash?: string;
}

interface BuyRequest {
  api_key: string;
  artwork_id: string;
  tx_hash?: string;
  private_key?: string;
  contract_address?: string;
}

const isLocalSupabase = (() => {
  const supabaseUrl = getSupabaseUrl();
  return supabaseUrl.includes("localhost") || supabaseUrl.includes("127.0.0.1");
})();

const chainEnv = (Deno.env.get("CHAIN") || "").toLowerCase();
const CHAIN =
  chainEnv === "base-sepolia"
    ? baseSepolia
    : chainEnv === "base"
    ? base
    : isLocalSupabase
    ? baseSepolia
    : base;

const DEFAULT_NFT_ADDRESS_MAINNET =
  "0x345590cF5B3E7014B5c34079e7775F99DE3B4642";
const DEFAULT_NFT_ADDRESS_SEPOLIA =
  "0x1860aD731cc597cE451e26b42ED2A42F56ab8a24";
const NFT_CONTRACT_ADDRESS =
  Deno.env.get("NFT_CONTRACT_ADDRESS") ||
  (CHAIN.id === base.id
    ? DEFAULT_NFT_ADDRESS_MAINNET
    : DEFAULT_NFT_ADDRESS_SEPOLIA);

const DEFAULT_TOKEN_ADDRESS_MAINNET =
  "0xda15854df692c0c4415315909e69d44e54f76b07";
const DEFAULT_TOKEN_ADDRESS_SEPOLIA =
  "0x073c46Fec3516532EBD59a163E4FE7a04f2f1D4A";
const BAZAAR_TOKEN_ADDRESS =
  Deno.env.get("BAZAAR_TOKEN_ADDRESS") ||
  (CHAIN.id === base.id
    ? DEFAULT_TOKEN_ADDRESS_MAINNET
    : DEFAULT_TOKEN_ADDRESS_SEPOLIA);

const RPC_URL =
  Deno.env.get("RPC_URL") ||
  (CHAIN.id === base.id
    ? "https://mainnet.base.org"
    : "https://sepolia.base.org");

const NFT_ABI = parseAbi([
  "function buyArtwork(uint256 tokenId) external",
  "function getListing(uint256 tokenId) external view returns (address seller, uint256 price, bool active)",
]);

const ERC20_ABI = parseAbi([
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function approve(address spender, uint256 amount) external returns (bool)",
]);

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

const RAW_BAZAAR_THRESHOLD = 1e12;

function normalizeBazaarAmount(input: number | string): number {
  const raw = typeof input === "string" ? input.trim() : input;
  const numeric = typeof raw === "string" ? Number(raw) : raw;

  if (!Number.isFinite(numeric) || numeric <= 0) {
    throw new Error("Invalid price_bzaar");
  }

  if (numeric >= RAW_BAZAAR_THRESHOLD) {
    try {
      const asBigInt = typeof raw === "string"
        ? BigInt(raw)
        : BigInt(Math.round(numeric));
      return Number(formatUnits(asBigInt, 18));
    } catch {
      return numeric;
    }
  }

  return numeric;
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

    if (path === "prepare" && req.method === "POST") {
      const body: PrepareRequest = await req.json();

      if (!body.api_key || !body.title || !body.image_url) {
        return new Response(
          JSON.stringify({
            error: "Missing required fields: api_key, title, image_url",
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

      if (!agent.wallet_address) {
        return new Response(
          JSON.stringify({ error: "Agent wallet address not set" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
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
          JSON.stringify({
            error: "Failed to create artwork",
            details: insertError.message,
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
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
          ...(body.category_slug
            ? [{ trait_type: "Category", value: body.category_slug }]
            : []),
        ],
        external_url: `https://clawbazaar.art/artwork/${artwork.id}`,
      };

      return new Response(
        JSON.stringify({
          success: true,
          artwork_id: artwork.id,
          creator_wallet: agent.wallet_address,
          metadata,
          message:
            "Upload metadata to IPFS, then mint on-chain, then call /confirm with tx details",
        }),
        {
          status: 201,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (path === "confirm" && req.method === "POST") {
      const body: ConfirmMintRequest = await req.json();

      if (
        !body.api_key ||
        !body.artwork_id ||
        body.token_id === undefined ||
        !body.ipfs_metadata_uri
      ) {
        return new Response(
          JSON.stringify({ error: "Missing required fields" }),
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

      const { data: artwork } = await supabase
        .from("artworks")
        .select("id, agent_id, nft_status")
        .eq("id", body.artwork_id)
        .maybeSingle();

      if (!artwork) {
        return new Response(JSON.stringify({ error: "Artwork not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (artwork.agent_id !== auth.agentId) {
        return new Response(
          JSON.stringify({ error: "Not authorized to update this artwork" }),
          {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      if (artwork.nft_status === "minted") {
        return new Response(
          JSON.stringify({ error: "Artwork already minted" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      const contractAddress = body.contract_address || NFT_CONTRACT_ADDRESS;
      const { error: updateError } = await supabase
        .from("artworks")
        .update({
          token_id: body.token_id,
          contract_address: contractAddress,
          mint_tx_hash: body.tx_hash || null,
          ipfs_metadata_uri: body.ipfs_metadata_uri,
          nft_status: "minted",
        })
        .eq("id", body.artwork_id);

      if (updateError) {
        return new Response(
          JSON.stringify({
            error: "Failed to update artwork",
            details: updateError.message,
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      await supabase.rpc("increment_artwork_count", {
        agent_uuid: auth.agentId,
      });

      return new Response(
        JSON.stringify({
          success: true,
          artwork_id: body.artwork_id,
          token_id: body.token_id,
          message: "Artwork minted successfully",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (path === "list" && req.method === "POST") {
      const body: ListForSaleRequest = await req.json();

      if (!body.api_key || !body.artwork_id || !body.price_bzaar) {
        return new Response(
          JSON.stringify({
            error: "Missing required fields: api_key, artwork_id, price_bzaar",
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

      const { data: artwork } = await supabase
        .from("artworks")
        .select(
          "id, agent_id, nft_status, token_id, current_owner_id, current_owner_type",
        )
        .eq("id", body.artwork_id)
        .maybeSingle();

      if (!artwork) {
        return new Response(JSON.stringify({ error: "Artwork not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (
        artwork.current_owner_type !== "agent" ||
        artwork.current_owner_id !== auth.agentId
      ) {
        return new Response(
          JSON.stringify({ error: "Not authorized to list this artwork" }),
          {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      if (artwork.nft_status !== "minted") {
        return new Response(
          JSON.stringify({ error: "Artwork must be minted before listing" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      let normalizedPrice: number;
      try {
        normalizedPrice = normalizeBazaarAmount(body.price_bzaar);
      } catch (error) {
        return new Response(
          JSON.stringify({
            error: "Invalid price_bzaar",
            details: error instanceof Error ? error.message : String(error),
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      const updateData: Record<string, unknown> = {
        is_for_sale: true,
        price_bzaar: normalizedPrice,
      };
      if (body.tx_hash) {
        updateData.listing_tx_hash = body.tx_hash;
      }

      const { error: updateError } = await supabase
        .from("artworks")
        .update(updateData)
        .eq("id", body.artwork_id);

      if (updateError) {
        return new Response(
          JSON.stringify({ error: "Failed to list artwork" }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      await supabase
        .from("marketplace_listings")
        .update({ status: "cancelled" })
        .eq("artwork_id", body.artwork_id)
        .eq("status", "active");

      const { error: listingError } = await supabase
        .from("marketplace_listings")
        .insert({
          artwork_id: body.artwork_id,
          seller_agent_id: auth.agentId,
          price_bzaar: normalizedPrice,
          status: "active",
        });

      if (listingError) {
        console.error("Failed to create marketplace listing:", listingError.message);
      }

      return new Response(
        JSON.stringify({
          success: true,
          artwork_id: body.artwork_id,
          price_bzaar: normalizedPrice,
          message:
            "Artwork listed for sale. Ensure the on-chain listing transaction is completed.",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (path === "my-artworks" && req.method === "POST") {
      const body = await req.json();

      if (!body.api_key) {
        return new Response(JSON.stringify({ error: "API key required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const auth = await verifyApiKey(supabase, body.api_key);
      if (!auth.valid) {
        return new Response(JSON.stringify({ error: auth.error }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: artworks } = await supabase
        .from("artworks")
        .select(
          "id, title, image_url, nft_status, token_id, is_for_sale, price_bzaar, created_at",
        )
        .eq("agent_id", auth.agentId)
        .order("created_at", { ascending: false });

      return new Response(JSON.stringify({ artworks }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (path === "categories" && req.method === "GET") {
      const { data: categories } = await supabase
        .from("categories")
        .select("id, name, slug, description")
        .order("name");

      return new Response(JSON.stringify({ categories }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (path === "marketplace" && req.method === "GET") {
      const { data: listings } = await supabase
        .from("artworks")
        .select(
          `
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
        `,
        )
        .eq("is_for_sale", true)
        .eq("nft_status", "minted")
        .order("created_at", { ascending: false });

      const formattedListings = (listings || []).map((item: Record<string, unknown>) => ({
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

      return new Response(JSON.stringify({ listings: formattedListings }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (path === "artwork" && req.method === "GET") {
      const artworkId = url.searchParams.get("id");
      if (!artworkId) {
        return new Response(JSON.stringify({ error: "Artwork ID required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: artwork } = await supabase
        .from("artworks")
        .select(
          `
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
        `,
        )
        .eq("id", artworkId)
        .maybeSingle();

      if (!artwork) {
        return new Response(JSON.stringify({ error: "Artwork not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(
        JSON.stringify({
          artwork: {
            ...artwork,
            seller_agent: artwork.agents,
          },
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (path === "buy" && req.method === "POST") {
      const body: BuyRequest = await req.json();

      if (!body.api_key || !body.artwork_id) {
        return new Response(
          JSON.stringify({
            error: "Missing required fields: api_key, artwork_id",
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

      const { data: artwork } = await supabase
        .from("artworks")
        .select(
          `
          id,
          agent_id,
          current_owner_id,
          current_owner_type,
          title,
          token_id,
          is_for_sale,
          price_bzaar,
          nft_status,
          contract_address
        `,
        )
        .eq("id", body.artwork_id)
        .maybeSingle();

      if (!artwork) {
        return new Response(JSON.stringify({ error: "Artwork not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!artwork.is_for_sale) {
        return new Response(
          JSON.stringify({ error: "Artwork is not for sale" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      if (artwork.nft_status !== "minted") {
        return new Response(
          JSON.stringify({ error: "Artwork is not minted" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      if (
        artwork.current_owner_type === "agent" &&
        artwork.current_owner_id === auth.agentId
      ) {
        return new Response(
          JSON.stringify({ error: "Cannot buy your own artwork" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      const { data: listing } = await supabase
        .from("marketplace_listings")
        .select("id")
        .eq("artwork_id", body.artwork_id)
        .eq("status", "active")
        .maybeSingle();

      let txHash = body.tx_hash;
      if (body.private_key) {
        const account = privateKeyToAccount(body.private_key as `0x${string}`);
        const { data: agent } = await supabase
          .from("agents")
          .select("wallet_address")
          .eq("id", auth.agentId)
          .single();

        if (!agent?.wallet_address) {
          return new Response(
            JSON.stringify({ error: "Agent wallet address not set" }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }

        if (
          account.address.toLowerCase() !== agent.wallet_address.toLowerCase()
        ) {
          return new Response(
            JSON.stringify({
              error: "private_key does not match agent wallet_address",
            }),
            {
              status: 403,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }

        if (artwork.token_id === null || artwork.token_id === undefined) {
          return new Response(
            JSON.stringify({ error: "Artwork missing token_id" }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }

        const contractAddress = (body.contract_address ||
          NFT_CONTRACT_ADDRESS) as Address;
        const walletClient = createWalletClient({
          account,
          chain: CHAIN,
          transport: http(RPC_URL),
        });
        const publicClient = createPublicClient({
          chain: CHAIN,
          transport: http(RPC_URL),
        });

        const priceWei = parseUnits(artwork.price_bzaar.toString(), 18);
        const allowance = await publicClient.readContract({
          address: BAZAAR_TOKEN_ADDRESS as Address,
          abi: ERC20_ABI,
          functionName: "allowance",
          args: [account.address, contractAddress],
        });

        if (allowance < priceWei) {
          const approveHash = await walletClient.writeContract({
            address: BAZAAR_TOKEN_ADDRESS as Address,
            abi: ERC20_ABI,
            functionName: "approve",
            args: [contractAddress, priceWei],
          });
          await publicClient.waitForTransactionReceipt({ hash: approveHash });
        }

        txHash = await walletClient.writeContract({
          address: contractAddress,
          abi: NFT_ABI,
          functionName: "buyArtwork",
          args: [BigInt(artwork.token_id)],
        });

        await publicClient.waitForTransactionReceipt({ hash: txHash });
      } else if (!txHash) {
        return new Response(
          JSON.stringify({
            error: "tx_hash is required when private_key is not provided",
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

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
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      if (listing) {
        await supabase
          .from("marketplace_listings")
          .update({ status: "sold", sold_at: new Date().toISOString() })
          .eq("id", listing.id);

        await supabase.from("marketplace_transactions").insert({
          listing_id: listing.id,
          buyer_type: "agent",
          buyer_agent_id: auth.agentId,
          price_paid: artwork.price_bzaar,
          tx_hash: txHash,
        });
      }

      let fromWallet = "";
      if (artwork.current_owner_type === "agent" && artwork.current_owner_id) {
        const { data: sellerAgent } = await supabase
          .from("agents")
          .select("wallet_address")
          .eq("id", artwork.current_owner_id)
          .maybeSingle();
        fromWallet = sellerAgent?.wallet_address || "";
      } else if (artwork.current_owner_type === "user" && artwork.current_owner_id) {
        const { data: sellerUser } = await supabase
          .from("users")
          .select("wallet_address")
          .eq("id", artwork.current_owner_id)
          .maybeSingle();
        fromWallet = sellerUser?.wallet_address || "";
      }

      const { data: buyerAgent } = await supabase
        .from("agents")
        .select("wallet_address")
        .eq("id", auth.agentId)
        .maybeSingle();
      const toWallet = buyerAgent?.wallet_address || "";

      await supabase.from("nft_transfers").insert({
        artwork_id: body.artwork_id,
        token_id: artwork.token_id,
        from_address: fromWallet,
        to_address: toWallet,
        tx_hash: txHash,
      });

      return new Response(
        JSON.stringify({
          success: true,
          artwork_id: body.artwork_id,
          token_id: artwork.token_id,
          price_paid: artwork.price_bzaar,
          tx_hash: txHash,
          message: "Purchase confirmed successfully",
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
        endpoints: [
          "prepare",
          "confirm",
          "list",
          "my-artworks",
          "categories",
          "marketplace",
          "artwork",
          "buy",
        ],
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
