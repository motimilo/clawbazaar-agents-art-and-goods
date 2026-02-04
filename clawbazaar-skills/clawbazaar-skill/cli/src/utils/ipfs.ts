import { createReadStream, statSync, readFileSync } from "fs";
import { basename, extname } from "path";
import FormData from "form-data";
import { getApiKey, getConfig, getSupabaseAnonKey } from "./config.js";

const MIME_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
};

export async function uploadFileToIpfs(filePath: string): Promise<string> {
  const config = getConfig();
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("Missing API key. Run: clawbazaar login <api-key>");
  }

  const stats = statSync(filePath);
  if (stats.size > 100 * 1024 * 1024) {
    throw new Error("File too large. Maximum size is 100MB");
  }

  const baseUrl = config.apiUrl.replace(/\/$/, "");
  const supabaseAnonKey = getSupabaseAnonKey();

  const formData = new FormData();
  formData.append("api_key", apiKey);
  formData.append("file", createReadStream(filePath), {
    filename: basename(filePath),
  });

  const response = await fetch(`${baseUrl}/ipfs-upload/upload-image`, {
    method: "POST",
    headers: {
      ...formData.getHeaders(),
      Authorization: `Bearer ${supabaseAnonKey}`,
      apikey: supabaseAnonKey,
    },
    body: formData as any,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to upload to IPFS: ${errorText}`);
  }

  const data = (await response.json()) as { ipfs_uri?: string; error?: string };
  if (!data.ipfs_uri) {
    throw new Error(data.error || "Upload failed");
  }
  return data.ipfs_uri;
}

export async function uploadJsonToIpfs(json: Record<string, unknown>): Promise<string> {
  const config = getConfig();
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("Missing API key. Run: clawbazaar login <api-key>");
  }

  const baseUrl = config.apiUrl.replace(/\/$/, "");
  const supabaseAnonKey = getSupabaseAnonKey();

  const response = await fetch(`${baseUrl}/ipfs-upload/upload-metadata`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${supabaseAnonKey}`,
      apikey: supabaseAnonKey,
    },
    body: JSON.stringify({ api_key: apiKey, metadata: json }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to upload metadata to IPFS: ${errorText}`);
  }

  const data = (await response.json()) as { ipfs_uri?: string; error?: string };
  if (!data.ipfs_uri) {
    throw new Error(data.error || "Upload failed");
  }
  return data.ipfs_uri;
}

export function ipfsToHttp(ipfsUri: string): string {
  const config = getConfig();
  if (ipfsUri.startsWith("ipfs://")) {
    const hash = ipfsUri.replace("ipfs://", "");
    return `${config.ipfsGateway}/${hash}`;
  }
  return ipfsUri;
}

export function fileToBase64DataUri(filePath: string): string {
  const ext = extname(filePath).toLowerCase();
  const mimeType = MIME_TYPES[ext] || "application/octet-stream";

  const stats = statSync(filePath);
  if (stats.size > 500 * 1024) {
    throw new Error("File too large for on-chain storage. Maximum size is 500KB. Use IPFS for larger files.");
  }

  const fileBuffer = readFileSync(filePath);
  const base64 = fileBuffer.toString("base64");

  return `data:${mimeType};base64,${base64}`;
}

export async function urlToBase64DataUri(imageUrl: string): Promise<string> {
  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.status}`);
  }

  const contentType = response.headers.get("content-type") || "image/png";
  const mimeType = contentType.split(";")[0].trim();

  const arrayBuffer = await response.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");

  const sizeKb = arrayBuffer.byteLength / 1024;
  if (sizeKb > 500) {
    throw new Error(`Image too large for on-chain storage (${sizeKb.toFixed(0)}KB). Maximum is 500KB.`);
  }

  return `data:${mimeType};base64,${base64}`;
}

export function createOnChainMetadataUri(metadata: Record<string, unknown>): string {
  const metadataJson = JSON.stringify(metadata);
  const metadataBase64 = Buffer.from(metadataJson).toString("base64");
  return `data:application/json;base64,${metadataBase64}`;
}
