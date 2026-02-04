import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import {
  createPublicClient,
  createWalletClient,
  http,
  parseAbi,
  decodeEventLog,
  type Address,
} from "npm:viem@2.21.0";
import { privateKeyToAccount } from "npm:viem@2.21.0/accounts";
import { base, baseSepolia } from "npm:viem@2.21.0/chains";
import { getSupabaseServiceRoleKey, getSupabaseUrl } from "../_shared/env.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

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

const RPC_URL =
  Deno.env.get("RPC_URL") ||
  (CHAIN.id === base.id
    ? "https://mainnet.base.org"
    : "https://sepolia.base.org");
const EXPLORER_BASE =
  CHAIN.id === base.id
    ? "https://basescan.org"
    : "https://sepolia.basescan.org";

// v2 contract (production-ready with OpenZeppelin best practices)
const DEFAULT_NFT_ADDRESS_MAINNET =
  "0x345590cF5B3E7014B5c34079e7775F99DE3B4642" as Address;
const DEFAULT_NFT_ADDRESS_SEPOLIA =
  "0x345590cF5B3E7014B5c34079e7775F99DE3B4642" as Address;

const NFT_CONTRACT_ADDRESS = (Deno.env.get("NFT_CONTRACT_ADDRESS") ||
  (CHAIN.id === base.id
    ? DEFAULT_NFT_ADDRESS_MAINNET
    : DEFAULT_NFT_ADDRESS_SEPOLIA)) as Address;
// Legacy v1: 0x8958b179b3f942f34F6A1945Fbc7f0B387FD8edA

const NFT_ABI = parseAbi([
  "function mintArtworkWithDefaultRoyalty(address to, string metadataUri) external returns (uint256)",
  "function totalSupply() external view returns (uint256)",
  "event ArtworkMinted(uint256 indexed tokenId, address indexed creator, string metadataUri, uint256 timestamp)",
]);

interface MintRequest {
  api_key: string;
  title: string;
  description?: string;
  image_url?: string;
  image_base64?: string;
  category?: string;
  style?: string;
  generation_prompt?: string;
  private_key?: string;
}

async function hashKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function verifyApiKeyAndGetAgent(
  supabase: ReturnType<typeof createClient>,
  apiKey: string,
) {
  const keyHash = await hashKey(apiKey);

  const { data: apiKeyRecord } = await supabase
    .from("agent_api_keys")
    .select("id, agent_id")
    .eq("key_hash", keyHash)
    .is("revoked_at", null)
    .maybeSingle();

  if (!apiKeyRecord) {
    return null;
  }

  await supabase
    .from("agent_api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", apiKeyRecord.id);

  const { data: agent } = await supabase
    .from("agents")
    .select("id, name, handle, wallet_address, encrypted_private_key")
    .eq("id", apiKeyRecord.agent_id)
    .maybeSingle();

  return agent;
}

async function fetchImageAsBase64(
  imageUrl: string,
): Promise<{ dataUri: string; mimeType: string }> {
  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.status}`);
  }

  const contentType = response.headers.get("content-type") || "image/png";
  const mimeType = contentType.split(";")[0].trim();

  const arrayBuffer = await response.arrayBuffer();
  const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

  return {
    dataUri: `data:${mimeType};base64,${base64}`,
    mimeType,
  };
}

function createOnChainMetadata(
  title: string,
  description: string,
  imageDataUri: string,
  agentName: string,
  agentHandle: string,
  attributes: Array<{ trait_type: string; value: string }>,
): string {
  const metadata = {
    name: title,
    description: description || "",
    image: imageDataUri,
    attributes: [
      { trait_type: "Creator", value: agentName },
      { trait_type: "Creator Handle", value: `@${agentHandle}` },
      { trait_type: "Storage", value: "On-Chain" },
      ...attributes,
    ],
    external_url: "https://clawbazaar.art",
  };

  const metadataJson = JSON.stringify(metadata);
  const metadataBase64 = btoa(unescape(encodeURIComponent(metadataJson)));
  return `data:application/json;base64,${metadataBase64}`;
}

function decryptPrivateKey(encryptedKey: string, _secret: string): string {
  return encryptedKey;
}

async function mintOnChain(
  privateKey: string,
  metadataUri: string,
): Promise<{ hash: string; tokenId: number }> {
  const account = privateKeyToAccount(privateKey as `0x${string}`);

  const publicClient = createPublicClient({
    chain: CHAIN,
    transport: http(RPC_URL),
  });

  const walletClient = createWalletClient({
    account,
    chain: CHAIN,
    transport: http(RPC_URL),
  });

  const hash = await walletClient.writeContract({
    address: NFT_CONTRACT_ADDRESS,
    abi: NFT_ABI,
    functionName: "mintArtworkWithDefaultRoyalty",
    args: [account.address, metadataUri],
  });

  const receipt = await publicClient.waitForTransactionReceipt({ hash });

  let tokenId: number | null = null;
  for (const log of receipt.logs) {
    if (log.address.toLowerCase() !== NFT_CONTRACT_ADDRESS.toLowerCase()) {
      continue;
    }
    try {
      const decoded = decodeEventLog({
        abi: NFT_ABI,
        data: log.data,
        topics: log.topics,
      });
      if (decoded.eventName === "ArtworkMinted") {
        tokenId = Number(decoded.args.tokenId);
        break;
      }
    } catch {
      // ignore non-matching logs
    }
  }

  if (tokenId === null) {
    const totalSupply = await publicClient.readContract({
      address: NFT_CONTRACT_ADDRESS,
      abi: NFT_ABI,
      functionName: "totalSupply",
    });
    tokenId = Math.max(Number(totalSupply) - 1, 0);
  }

  return { hash, tokenId };
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

    if (path === "mint" && req.method === "POST") {
      const body: MintRequest = await req.json();

      if (!body.api_key || !body.title) {
        return new Response(
          JSON.stringify({ error: "Missing required fields: api_key, title" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      if (!body.image_url && !body.image_base64) {
        return new Response(
          JSON.stringify({
            error: "Either image_url or image_base64 is required",
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      const agent = await verifyApiKeyAndGetAgent(supabase, body.api_key);
      if (!agent) {
        return new Response(JSON.stringify({ error: "Invalid API key" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!agent.encrypted_private_key && !body.private_key) {
        return new Response(
          JSON.stringify({
            error:
              "Missing private_key for server-side minting. Provide private_key or configure agent wallet.",
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      let imageDataUri: string;
      let originalImageUrl = body.image_url || "";

      if (body.image_base64) {
        const mimeMatch = body.image_base64.match(/^data:([^;]+);base64,/);
        if (mimeMatch) {
          imageDataUri = body.image_base64;
        } else {
          imageDataUri = `data:image/png;base64,${body.image_base64}`;
        }
      } else if (body.image_url) {
        const imageData = await fetchImageAsBase64(body.image_url);
        imageDataUri = imageData.dataUri;
      } else {
        return new Response(JSON.stringify({ error: "Image required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const attributes: Array<{ trait_type: string; value: string }> = [];
      if (body.category) {
        attributes.push({ trait_type: "Category", value: body.category });
      }
      if (body.style) {
        attributes.push({ trait_type: "Style", value: body.style });
      }

      const metadataUri = createOnChainMetadata(
        body.title,
        body.description || "",
        imageDataUri,
        agent.name,
        agent.handle,
        attributes,
      );

      const { data: artwork, error: artworkError } = await supabase
        .from("artworks")
        .insert({
          title: body.title,
          description: body.description || null,
          image_url: originalImageUrl || imageDataUri.substring(0, 200) + "...",
          agent_id: agent.id,
          nft_status: "pending",
          style: body.style || null,
          generation_prompt: body.generation_prompt || null,
          current_owner_type: "agent",
          current_owner_id: agent.id,
        })
        .select()
        .single();

      if (artworkError) {
        return new Response(
          JSON.stringify({
            error: "Failed to create artwork record",
            details: artworkError.message,
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      let mintResult: { hash: string; tokenId: number };
      try {
        let privateKey: string;
        if (body.private_key) {
          const account = privateKeyToAccount(
            body.private_key as `0x${string}`,
          );
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
          privateKey = body.private_key;
        } else {
          privateKey = decryptPrivateKey(
            agent.encrypted_private_key,
            getSupabaseServiceRoleKey(),
          );
        }

        mintResult = await mintOnChain(privateKey, metadataUri);
      } catch (mintError) {
        await supabase
          .from("artworks")
          .update({ nft_status: "failed" })
          .eq("id", artwork.id);

        return new Response(
          JSON.stringify({
            error: "On-chain minting failed",
            details:
              mintError instanceof Error ? mintError.message : "Unknown error",
            artwork_id: artwork.id,
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      const { error: updateError } = await supabase
        .from("artworks")
        .update({
          nft_status: "minted",
          token_id: mintResult.tokenId,
          mint_tx_hash: mintResult.hash,
          contract_address: NFT_CONTRACT_ADDRESS,
          ipfs_metadata_uri: metadataUri,
        })
        .eq("id", artwork.id);

      if (updateError) {
        console.error("Failed to update artwork record:", updateError);
      }

      await supabase
        .from("agents")
        .update({
          artwork_count: agent.artwork_count ? agent.artwork_count + 1 : 1,
        })
        .eq("id", agent.id);

      return new Response(
        JSON.stringify({
          success: true,
          artwork_id: artwork.id,
          token_id: mintResult.tokenId,
          tx_hash: mintResult.hash,
          metadata_uri: metadataUri,
          explorer_url: `${EXPLORER_BASE}/tx/${mintResult.hash}`,
          message: "Artwork minted on-chain with embedded image data",
        }),
        {
          status: 201,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (path === "status" && req.method === "POST") {
      const body = await req.json();

      if (!body.api_key || !body.artwork_id) {
        return new Response(
          JSON.stringify({ error: "Missing api_key or artwork_id" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      const agent = await verifyApiKeyAndGetAgent(supabase, body.api_key);
      if (!agent) {
        return new Response(JSON.stringify({ error: "Invalid API key" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: artwork } = await supabase
        .from("artworks")
        .select("id, title, nft_status, token_id, mint_tx_hash, created_at")
        .eq("id", body.artwork_id)
        .eq("agent_id", agent.id)
        .maybeSingle();

      if (!artwork) {
        return new Response(JSON.stringify({ error: "Artwork not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ artwork }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ error: "Not found", endpoints: ["mint", "status"] }),
      {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Mint artwork error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
