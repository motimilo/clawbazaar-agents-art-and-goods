import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { getSupabaseServiceRoleKey, getSupabaseUrl } from "../_shared/env.ts";
import {
  createPublicClient,
  createWalletClient,
  decodeEventLog,
  http,
  parseAbi,
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

interface CreateEditionRequest {
  api_key: string;
  title: string;
  description?: string;
  image_url: string;
  metadata_uri?: string;
  max_supply: number;
  max_per_wallet?: number;
  price_bzaar: number;
  duration_hours?: number;
  royalty_bps?: number;
  private_key?: string;
  contract_address?: string;
}

interface ConfirmEditionRequest {
  api_key: string;
  edition_id: string;
  edition_id_on_chain: number;
  contract_address?: string;
  creation_tx_hash?: string;
  ipfs_metadata_uri: string;
}

interface MintEditionRequest {
  api_key: string;
  edition_id: string;
  amount: number;
  tx_hash?: string;
  private_key?: string;
}

interface CloseEditionRequest {
  api_key: string;
  edition_id: string;
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

const RPC_URL =
  Deno.env.get("RPC_URL") ||
  (CHAIN.id === base.id
    ? "https://mainnet.base.org"
    : "https://sepolia.base.org");

const DEFAULT_EDITIONS_ADDRESS_MAINNET =
  "0x20380549d6348f456e8718b6D83b48d0FB06B29a" as Address;
const DEFAULT_EDITIONS_ADDRESS_SEPOLIA =
  "0x63db48056eDb046E41BF93B8cFb7388cc9005C22" as Address;

const EDITIONS_CONTRACT_ADDRESS = (Deno.env.get("EDITIONS_CONTRACT_ADDRESS") ||
  (CHAIN.id === base.id
    ? DEFAULT_EDITIONS_ADDRESS_MAINNET
    : DEFAULT_EDITIONS_ADDRESS_SEPOLIA)) as Address;

const EDITIONS_ABI = parseAbi([
  "function createEdition(string metadataUri,uint256 maxSupply,uint256 maxPerWallet,uint256 price,uint256 durationSeconds,uint96 royaltyBps) external returns (uint256)",
  "function mint(uint256 editionId,uint256 amount) external",
  "event EditionCreated(uint256 indexed editionId,address indexed creator,uint256 maxSupply,uint256 price)",
  "event EditionMinted(uint256 indexed editionId,address indexed minter,uint256 amount,uint256 totalPaid)",
]);

async function hashKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function verifyApiKey(
  supabase: any,
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

    if (path === "create" && req.method === "POST") {
      const body: CreateEditionRequest = await req.json();

      if (
        !body.api_key ||
        !body.title ||
        !body.image_url ||
        !body.max_supply ||
        !body.price_bzaar
      ) {
        return new Response(
          JSON.stringify({
            error:
              "Missing required fields: api_key, title, image_url, max_supply, price_bzaar",
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      if (body.max_supply < 1 || body.max_supply > 1000) {
        return new Response(
          JSON.stringify({ error: "max_supply must be between 1 and 1000" }),
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

      const mintEnd = body.duration_hours
        ? new Date(
            Date.now() + body.duration_hours * 60 * 60 * 1000,
          ).toISOString()
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
          JSON.stringify({
            error: "Failed to create edition",
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
          { trait_type: "Edition Type", value: "Limited Edition" },
          { trait_type: "Max Supply", value: body.max_supply.toString() },
        ],
        external_url: `https://clawbazaar.art/edition/${edition.id}`,
      };

      let metadataUri = body.metadata_uri;
      const contractAddress = (body.contract_address ||
        EDITIONS_CONTRACT_ADDRESS) as Address;

      if (body.private_key) {
        if (!metadataUri) {
          const pinataApiKey = Deno.env.get("PINATA_API_KEY");
          const pinataSecretApiKey = Deno.env.get("PINATA_SECRET_API_KEY");

          if (!pinataApiKey || !pinataSecretApiKey) {
            return new Response(
              JSON.stringify({
                error:
                  "metadata_uri is required when IPFS is not configured. Please provide metadata_uri or configure IPFS.",
              }),
              {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              },
            );
          }

          try {
            const pinataResponse = await fetch(
              "https://api.pinata.cloud/pinning/pinJSONToIPFS",
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  pinata_api_key: pinataApiKey,
                  pinata_secret_api_key: pinataSecretApiKey,
                },
                body: JSON.stringify({
                  pinataContent: metadata,
                  pinataMetadata: {
                    name: `edition-${edition.id}-metadata.json`,
                  },
                }),
              },
            );

            if (!pinataResponse.ok) {
              const errorText = await pinataResponse.text();
              console.error("IPFS upload failed:", errorText);
              return new Response(
                JSON.stringify({
                  error: "Failed to upload metadata to IPFS",
                  details: errorText,
                }),
                {
                  status: 500,
                  headers: {
                    ...corsHeaders,
                    "Content-Type": "application/json",
                  },
                },
              );
            }

            const ipfsData = await pinataResponse.json();
            metadataUri = `ipfs://${ipfsData.IpfsHash}`;
            console.log("Edition metadata uploaded to IPFS:", metadataUri);
          } catch (error) {
            console.error("Error uploading to IPFS:", error);
            return new Response(
              JSON.stringify({
                error: "Failed to upload metadata to IPFS",
                details: error instanceof Error ? error.message : String(error),
              }),
              {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              },
            );
          }
        }

        const account = privateKeyToAccount(body.private_key as `0x${string}`);
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

        const walletClient = createWalletClient({
          account,
          chain: CHAIN,
          transport: http(RPC_URL),
        });
        const publicClient = createPublicClient({
          chain: CHAIN,
          transport: http(RPC_URL),
        });

        const durationSeconds = body.duration_hours
          ? Math.floor(body.duration_hours * 60 * 60)
          : 0;

        const txHash = await walletClient.writeContract({
          address: contractAddress,
          abi: EDITIONS_ABI,
          functionName: "createEdition",
          args: [
            metadataUri,
            BigInt(body.max_supply),
            BigInt(body.max_per_wallet || 10),
            BigInt(body.price_bzaar),
            BigInt(durationSeconds),
            BigInt(body.royalty_bps || 500),
          ],
        });

        const receipt = await publicClient.waitForTransactionReceipt({
          hash: txHash,
        });
        let editionIdOnChain: number | null = null;
        for (const log of receipt.logs) {
          if (log.address.toLowerCase() !== contractAddress.toLowerCase())
            continue;
          try {
            const decoded = decodeEventLog({
              abi: EDITIONS_ABI,
              data: log.data,
              topics: log.topics,
            });
            if (decoded.eventName === "EditionCreated") {
              editionIdOnChain = Number(decoded.args.editionId);
              break;
            }
          } catch {
            // ignore non-matching logs
          }
        }

        if (editionIdOnChain === null) {
          return new Response(
            JSON.stringify({
              error: "Failed to read edition id from transaction logs",
              tx_hash: txHash,
            }),
            {
              status: 500,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }

        const { error: chainUpdateError } = await supabase
          .from("editions")
          .update({
            edition_id_on_chain: editionIdOnChain,
            contract_address: contractAddress,
            creation_tx_hash: txHash,
            ipfs_metadata_uri: metadataUri,
          })
          .eq("id", edition.id);

        if (chainUpdateError) {
          return new Response(
            JSON.stringify({
              error: "Failed to update edition on-chain data",
              details: chainUpdateError.message,
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
            edition_id: edition.id,
            edition_id_on_chain: editionIdOnChain,
            creator_wallet: agent.wallet_address,
            contract_address: contractAddress,
            creation_tx_hash: txHash,
            ipfs_metadata_uri: metadataUri,
            message: "Edition created on-chain",
          }),
          {
            status: 201,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          edition_id: edition.id,
          creator_wallet: agent.wallet_address,
          metadata,
          contract_address: contractAddress,
          message:
            "Upload metadata to IPFS, then create edition on-chain, then call /confirm with tx details",
        }),
        {
          status: 201,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (path === "confirm" && req.method === "POST") {
      const body: ConfirmEditionRequest = await req.json();

      if (
        !body.api_key ||
        !body.edition_id ||
        body.edition_id_on_chain === undefined ||
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

      const { data: edition } = await supabase
        .from("editions")
        .select("id, agent_id, edition_id_on_chain")
        .eq("id", body.edition_id)
        .maybeSingle();

      if (!edition) {
        return new Response(JSON.stringify({ error: "Edition not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (edition.agent_id !== auth.agentId) {
        return new Response(
          JSON.stringify({ error: "Not authorized to update this edition" }),
          {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      if (edition.edition_id_on_chain !== null) {
        return new Response(
          JSON.stringify({ error: "Edition already confirmed on-chain" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      const contractAddress =
        body.contract_address || EDITIONS_CONTRACT_ADDRESS;

      const { data: existingClaim } = await supabase
        .from("editions")
        .select("id, title")
        .eq("contract_address", contractAddress)
        .eq("edition_id_on_chain", body.edition_id_on_chain)
        .neq("id", body.edition_id)
        .maybeSingle();

      if (existingClaim) {
        return new Response(
          JSON.stringify({
            error: `Edition ID ${body.edition_id_on_chain} is already claimed by edition "${existingClaim.title}"`,
            existing_edition_id: existingClaim.id,
          }),
          {
            status: 409,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      const { error: updateError } = await supabase
        .from("editions")
        .update({
          edition_id_on_chain: body.edition_id_on_chain,
          contract_address: contractAddress,
          creation_tx_hash: body.creation_tx_hash || null,
          ipfs_metadata_uri: body.ipfs_metadata_uri,
        })
        .eq("id", body.edition_id);

      if (updateError) {
        return new Response(
          JSON.stringify({
            error: "Failed to update edition",
            details: updateError.message,
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
          edition_id: body.edition_id,
          edition_id_on_chain: body.edition_id_on_chain,
          contract_address: contractAddress,
          message: "Edition confirmed on-chain",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (path === "mint" && req.method === "POST") {
      const body: MintEditionRequest = await req.json();

      if (!body.api_key || !body.edition_id || !body.amount) {
        return new Response(
          JSON.stringify({
            error: "Missing required fields: api_key, edition_id, amount",
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

      const { data: edition } = await supabase
        .from("editions")
        .select(
          "id, max_supply, total_minted, max_per_wallet, price_bzaar, is_active, mint_end, edition_id_on_chain, contract_address",
        )
        .eq("id", body.edition_id)
        .maybeSingle();

      if (!edition) {
        return new Response(JSON.stringify({ error: "Edition not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!edition.is_active) {
        return new Response(
          JSON.stringify({ error: "Edition is no longer active" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      if (edition.mint_end && new Date(edition.mint_end) < new Date()) {
        return new Response(
          JSON.stringify({ error: "Minting period has ended" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      if (edition.total_minted + body.amount > edition.max_supply) {
        return new Response(JSON.stringify({ error: "Exceeds max supply" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: existingMints } = await supabase
        .from("edition_mints")
        .select("id")
        .eq("edition_id", body.edition_id)
        .eq("minter_agent_id", auth.agentId);

      const currentMints = existingMints?.length || 0;
      if (currentMints + body.amount > edition.max_per_wallet) {
        return new Response(
          JSON.stringify({
            error: `Exceeds wallet limit of ${edition.max_per_wallet}`,
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      const { data: agent } = await supabase
        .from("agents")
        .select("wallet_address")
        .eq("id", auth.agentId)
        .single();

      let txHash = body.tx_hash;
      if (body.private_key) {
        const account = privateKeyToAccount(body.private_key as `0x${string}`);
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

        if (
          edition.edition_id_on_chain === null ||
          edition.edition_id_on_chain === undefined
        ) {
          return new Response(
            JSON.stringify({ error: "Edition not confirmed on-chain yet" }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }

        const contractAddress = (edition.contract_address ||
          EDITIONS_CONTRACT_ADDRESS) as Address;
        const walletClient = createWalletClient({
          account,
          chain: CHAIN,
          transport: http(RPC_URL),
        });
        const publicClient = createPublicClient({
          chain: CHAIN,
          transport: http(RPC_URL),
        });

        txHash = await walletClient.writeContract({
          address: contractAddress,
          abi: EDITIONS_ABI,
          functionName: "mint",
          args: [BigInt(edition.edition_id_on_chain), BigInt(body.amount)],
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

      const mintsToInsert = [];
      for (let i = 0; i < body.amount; i++) {
        mintsToInsert.push({
          edition_id: body.edition_id,
          edition_number: edition.total_minted + i + 1,
          minter_type: "agent",
          minter_agent_id: auth.agentId,
          minter_wallet: agent.wallet_address,
          price_paid_bzaar: edition.price_bzaar,
          tx_hash: txHash,
        });
      }

      const { error: mintError } = await supabase
        .from("edition_mints")
        .insert(mintsToInsert);

      if (mintError) {
        return new Response(
          JSON.stringify({
            error: "Failed to record mints",
            details: mintError.message,
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
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
          edition_numbers: mintsToInsert.map((m) => m.edition_number),
          total_minted: newTotal,
          remaining: edition.max_supply - newTotal,
          tx_hash: txHash,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (path === "close" && req.method === "POST") {
      const body: CloseEditionRequest = await req.json();

      if (!body.api_key || !body.edition_id) {
        return new Response(
          JSON.stringify({
            error: "Missing required fields: api_key, edition_id",
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

      const { data: edition } = await supabase
        .from("editions")
        .select("id, agent_id, is_active, total_minted")
        .eq("id", body.edition_id)
        .maybeSingle();

      if (!edition) {
        return new Response(JSON.stringify({ error: "Edition not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (edition.agent_id !== auth.agentId) {
        return new Response(
          JSON.stringify({ error: "Not authorized to close this edition" }),
          {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      if (!edition.is_active) {
        return new Response(
          JSON.stringify({ error: "Edition is already closed" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
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
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (path === "list" && req.method === "GET") {
      const activeOnly = url.searchParams.get("active") === "true";
      const agentId = url.searchParams.get("agent_id");

      let query = supabase
        .from("editions")
        .select(
          `
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
        `,
        )
        .order("created_at", { ascending: false });

      if (activeOnly) {
        query = query.eq("is_active", true);
      }

      if (agentId) {
        query = query.eq("agent_id", agentId);
      }

      const { data: editions } = await query;

      return new Response(JSON.stringify({ editions }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (path === "detail" && req.method === "GET") {
      const editionId = url.searchParams.get("id");
      if (!editionId) {
        return new Response(JSON.stringify({ error: "Edition ID required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: edition } = await supabase
        .from("editions")
        .select(
          `
          *,
          agents!editions_agent_id_fkey (
            id,
            name,
            handle,
            avatar_url,
            wallet_address
          )
        `,
        )
        .eq("id", editionId)
        .maybeSingle();

      if (!edition) {
        return new Response(JSON.stringify({ error: "Edition not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: recentMints } = await supabase
        .from("edition_mints")
        .select(
          `
          id,
          edition_number,
          minter_wallet,
          price_paid_bzaar,
          minted_at,
          agents!edition_mints_minter_agent_id_fkey (
            name,
            handle
          )
        `,
        )
        .eq("edition_id", editionId)
        .order("minted_at", { ascending: false })
        .limit(10);

      return new Response(
        JSON.stringify({
          edition,
          recent_mints: recentMints,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (path === "my-editions" && req.method === "POST") {
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

      const { data: editions } = await supabase
        .from("editions")
        .select(
          "id, title, image_url, max_supply, total_minted, price_bzaar, is_active, created_at",
        )
        .eq("agent_id", auth.agentId)
        .order("created_at", { ascending: false });

      return new Response(JSON.stringify({ editions }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        error: "Not found",
        endpoints: [
          "create",
          "confirm",
          "mint",
          "close",
          "list",
          "detail",
          "my-editions",
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
        details: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
