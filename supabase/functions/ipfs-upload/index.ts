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

const PINATA_API_KEY = Deno.env.get("PINATA_API_KEY") || "";
const PINATA_SECRET_KEY = Deno.env.get("PINATA_SECRET_KEY") || "";

interface PinataResponse {
  IpfsHash: string;
  PinSize: number;
  Timestamp: string;
}

function parseBase64Input(input: string): { data: string; mimeType: string } {
  const trimmed = input.trim();
  if (trimmed.startsWith("data:")) {
    const match = trimmed.match(/^data:([^;]+);base64,(.*)$/);
    if (!match) {
      throw new Error("Invalid base64 data URI");
    }
    return { mimeType: match[1], data: match[2].replace(/\s/g, "") };
  }
  return { mimeType: "image/png", data: trimmed.replace(/\s/g, "") };
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function verifyApiKey(supabase: ReturnType<typeof createClient>, apiKey: string) {
  // Hash the API key
  const keyHash = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(apiKey)
  );
  const hashHex = Array.from(new Uint8Array(keyHash))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");

  // Look up by hash and check not revoked
  const { data, error } = await supabase
    .from("agent_api_keys")
    .select(`
      id,
      agent_id,
      agents (
        id,
        name,
        handle,
        wallet_address
      )
    `)
    .eq("key_hash", hashHex)
    .is("revoked_at", null)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  // Update last_used_at
  await supabase
    .from("agent_api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", data.id);

  return data.agents;
}

async function uploadJsonToPinata(json: Record<string, unknown>): Promise<string> {
  const response = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      pinata_api_key: PINATA_API_KEY,
      pinata_secret_api_key: PINATA_SECRET_KEY,
    },
    body: JSON.stringify({
      pinataContent: json,
      pinataMetadata: {
        name: `clawbazaar-metadata-${Date.now()}`,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to upload to IPFS: ${error}`);
  }

  const data = (await response.json()) as PinataResponse;
  return `ipfs://${data.IpfsHash}`;
}

async function uploadUrlToPinata(imageUrl: string): Promise<string> {
  const imageResponse = await fetch(imageUrl);
  if (!imageResponse.ok) {
    throw new Error("Failed to fetch image from URL");
  }

  const imageBlob = await imageResponse.blob();
  const filename = imageUrl.split("/").pop()?.split("?")[0] || "image.png";
  return uploadBlobToPinata(imageBlob, filename);
}

async function uploadBlobToPinata(blob: Blob, filename: string): Promise<string> {
  const formData = new FormData();
  formData.append("file", blob, filename);
  formData.append("pinataMetadata", JSON.stringify({
    name: `clawbazaar-image-${Date.now()}`,
  }));

  const response = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
    method: "POST",
    headers: {
      pinata_api_key: PINATA_API_KEY,
      pinata_secret_api_key: PINATA_SECRET_KEY,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to upload image to IPFS: ${error}`);
  }

  const data = (await response.json()) as PinataResponse;
  return `ipfs://${data.IpfsHash}`;
}

async function uploadBase64ToPinata(imageBase64: string, filename?: string, mimeType?: string): Promise<string> {
  const parsed = parseBase64Input(imageBase64);
  const finalMimeType = mimeType || parsed.mimeType;
  const bytes = base64ToBytes(parsed.data);
  const blob = new Blob([bytes], { type: finalMimeType });
  const resolvedName = filename || `image-${Date.now()}.png`;
  return uploadBlobToPinata(blob, resolvedName);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    if (!PINATA_API_KEY || !PINATA_SECRET_KEY) {
      return new Response(
        JSON.stringify({ error: "Pinata not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      getSupabaseUrl(),
      getSupabaseServiceRoleKey(),
    );

    const url = new URL(req.url);
    const path = url.pathname.split("/").pop();

    if (req.method === "POST" && path === "upload-image") {
      const contentType = req.headers.get("content-type") || "";
      let api_key: string | undefined;
      let image_url: string | undefined;
      let image_base64: string | undefined;
      let filename: string | undefined;
      let mime_type: string | undefined;
      let file: File | null = null;

      if (contentType.includes("multipart/form-data")) {
        const form = await req.formData();
        api_key = form.get("api_key")?.toString();
        image_url = form.get("image_url")?.toString();
        image_base64 = form.get("image_base64")?.toString();
        filename = form.get("filename")?.toString();
        mime_type = form.get("mime_type")?.toString();

        const fileField = form.get("file");
        if (fileField instanceof File) {
          file = fileField;
        }
      } else {
        const body = await req.json();
        api_key = body.api_key;
        image_url = body.image_url;
        image_base64 = body.image_base64;
        filename = body.filename;
        mime_type = body.mime_type;
      }

      if (!api_key) {
        return new Response(
          JSON.stringify({ error: "Missing api_key" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!image_url && !image_base64 && !file) {
        return new Response(
          JSON.stringify({ error: "Missing image_url, image_base64, or file" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const agent = await verifyApiKey(supabase, api_key);
      if (!agent) {
        return new Response(
          JSON.stringify({ error: "Invalid API key" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      let ipfsUri: string;
      if (file) {
        ipfsUri = await uploadBlobToPinata(file, filename || file.name || `image-${Date.now()}.png`);
      } else if (image_base64) {
        ipfsUri = await uploadBase64ToPinata(image_base64, filename, mime_type);
      } else {
        ipfsUri = await uploadUrlToPinata(image_url!);
      }

      return new Response(
        JSON.stringify({
          success: true,
          ipfs_uri: ipfsUri,
          gateway_url: `https://gateway.pinata.cloud/ipfs/${ipfsUri.replace("ipfs://", "")}`,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (req.method === "POST" && path === "upload-metadata") {
      const body = await req.json();
      const { api_key, metadata } = body;

      if (!api_key || !metadata) {
        return new Response(
          JSON.stringify({ error: "Missing api_key or metadata" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const agent = await verifyApiKey(supabase, api_key);
      if (!agent) {
        return new Response(
          JSON.stringify({ error: "Invalid API key" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const ipfsUri = await uploadJsonToPinata(metadata);

      return new Response(
        JSON.stringify({
          success: true,
          ipfs_uri: ipfsUri,
          gateway_url: `https://gateway.pinata.cloud/ipfs/${ipfsUri.replace("ipfs://", "")}`,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (req.method === "POST" && path === "upload-artwork") {
      const body = await req.json();
      const { api_key, image_url, name, description, attributes } = body;

      if (!api_key || !image_url || !name) {
        return new Response(
          JSON.stringify({ error: "Missing required fields: api_key, image_url, name" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const agent = await verifyApiKey(supabase, api_key);
      if (!agent) {
        return new Response(
          JSON.stringify({ error: "Invalid API key" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const imageIpfsUri = await uploadUrlToPinata(image_url);

      const metadata = {
        name,
        description: description || "",
        image: imageIpfsUri,
        attributes: attributes || [
          { trait_type: "Creator", value: (agent as { name: string }).name },
          { trait_type: "Creator Handle", value: (agent as { handle: string }).handle },
        ],
        external_url: `https://clawbazaar.art`,
      };

      const metadataIpfsUri = await uploadJsonToPinata(metadata);

      return new Response(
        JSON.stringify({
          success: true,
          image_ipfs_uri: imageIpfsUri,
          metadata_ipfs_uri: metadataIpfsUri,
          metadata,
          gateway_urls: {
            image: `https://gateway.pinata.cloud/ipfs/${imageIpfsUri.replace("ipfs://", "")}`,
            metadata: `https://gateway.pinata.cloud/ipfs/${metadataIpfsUri.replace("ipfs://", "")}`,
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        error: "Not found",
        endpoints: ["upload-image", "upload-metadata", "upload-artwork"],
      }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("IPFS upload error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
