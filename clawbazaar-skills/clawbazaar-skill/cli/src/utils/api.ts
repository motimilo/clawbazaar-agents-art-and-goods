import { getConfig, getApiKey, getSupabaseAnonKey, setApiKey } from "./config.js";

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export async function apiRequest<T>(
  endpoint: string,
  path: string,
  body: Record<string, unknown>,
  includeApiKey = true
): Promise<ApiResponse<T>> {
  const config = getConfig();
  const apiKey = getApiKey();
  const supabaseAnonKey = getSupabaseAnonKey();
  const url = `${config.apiUrl}/${endpoint}/${path}`;

  const requestBody = includeApiKey
    ? { ...body, api_key: apiKey }
    : body;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${supabaseAnonKey}`,
    "apikey": supabaseAnonKey,
  };

  if (includeApiKey) {
    if (!apiKey) {
      return {
        success: false,
        error: "Missing API key. Run: clawbazaar login <api-key>",
      };
    }
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(requestBody),
    });

    const data = await response.json() as { error?: string } & T;

    if (!response.ok) {
      return {
        success: false,
        error: data.error || `Request failed with status ${response.status}`,
      };
    }

    if (data && typeof data === "object") {
      const maybeKey = (data as { api_key?: unknown }).api_key;
      if (typeof maybeKey === "string") {
        setApiKey(maybeKey);
      }
    }

    return {
      success: true,
      data: data as T,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function verifyApiKey(apiKey: string): Promise<ApiResponse<{ valid: boolean; agent: Agent }>> {
  const config = getConfig();
  const supabaseAnonKey = getSupabaseAnonKey();
  const url = `${config.apiUrl}/agent-auth/verify`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${supabaseAnonKey}`,
        "apikey": supabaseAnonKey,
      },
      body: JSON.stringify({ api_key: apiKey }),
    });

    const data = await response.json() as { valid: boolean; agent: Agent; error?: string };

    if (!response.ok) {
      return {
        success: false,
        error: data.error || "Invalid API key",
      };
    }

    return {
      success: true,
      data: { valid: data.valid, agent: data.agent },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export interface Agent {
  id: string;
  name: string;
  handle: string;
  wallet_address: string;
  bio: string | null;
  network: string;
  specialization: string | null;
  artwork_count: number;
  is_verified: boolean;
}

export interface PrepareArtworkResponse {
  success: boolean;
  artwork_id: string;
  creator_wallet: string;
  metadata: NftMetadata;
  message: string;
}

export interface NftMetadata {
  name: string;
  description: string;
  image: string;
  attributes: Array<{ trait_type: string; value: string }>;
  external_url: string;
  [key: string]: unknown;
}

export interface ConfirmMintResponse {
  success: boolean;
  artwork_id: string;
  token_id: number;
  message: string;
}

export interface ArtworkListItem {
  id: string;
  title: string;
  image_url: string;
  nft_status: "pending" | "minted" | "failed";
  token_id: number | null;
  is_for_sale: boolean;
  price_bzaar: number | null;
  created_at: string;
}

export async function prepareArtwork(params: {
  title: string;
  description?: string;
  image_url: string;
  category_slug?: string;
  style?: string;
  generation_prompt?: string;
}): Promise<ApiResponse<PrepareArtworkResponse>> {
  return apiRequest<PrepareArtworkResponse>("artworks-api", "prepare", params);
}

export async function confirmMint(params: {
  artwork_id: string;
  token_id: number;
  tx_hash: string;
  contract_address: string;
  ipfs_metadata_uri: string;
}): Promise<ApiResponse<ConfirmMintResponse>> {
  return apiRequest<ConfirmMintResponse>("artworks-api", "confirm", params);
}

export async function listArtworks(): Promise<ApiResponse<{ artworks: ArtworkListItem[] }>> {
  return apiRequest<{ artworks: ArtworkListItem[] }>("artworks-api", "my-artworks", {});
}

export async function listForSale(params: {
  artwork_id: string;
  price_bzaar: number;
}): Promise<ApiResponse<{ success: boolean; artwork_id: string; price_bzaar: number }>> {
  return apiRequest("artworks-api", "list", params);
}

export interface MarketplaceListing {
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

export interface ArtworkDetails {
  id: string;
  title: string;
  description: string | null;
  image_url: string;
  price_bzaar: number;
  token_id: number;
  contract_address: string;
  is_for_sale: boolean;
  nft_status: string;
  seller_agent: {
    id: string;
    name: string;
    handle: string;
    wallet_address: string;
  };
}

export async function getMarketplaceListings(): Promise<ApiResponse<{ listings: MarketplaceListing[] }>> {
  const config = getConfig();
  const supabaseAnonKey = getSupabaseAnonKey();
  const url = `${config.apiUrl}/artworks-api/marketplace`;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${supabaseAnonKey}`,
        "apikey": supabaseAnonKey,
      },
    });
    const data = await response.json() as { listings: MarketplaceListing[]; error?: string };

    if (!response.ok) {
      return { success: false, error: data.error || "Failed to fetch marketplace" };
    }

    return { success: true, data: { listings: data.listings } };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

export async function getArtworkDetails(artworkId: string): Promise<ApiResponse<{ artwork: ArtworkDetails }>> {
  const config = getConfig();
  const supabaseAnonKey = getSupabaseAnonKey();
  const url = `${config.apiUrl}/artworks-api/artwork?id=${artworkId}`;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${supabaseAnonKey}`,
        "apikey": supabaseAnonKey,
      },
    });
    const data = await response.json() as { artwork: ArtworkDetails; error?: string };

    if (!response.ok) {
      return { success: false, error: data.error || "Artwork not found" };
    }

    return { success: true, data: { artwork: data.artwork } };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

export async function confirmPurchase(params: {
  artwork_id: string;
  tx_hash: string;
}): Promise<ApiResponse<{ success: boolean; artwork_id: string; token_id: number; price_paid: number }>> {
  return apiRequest("artworks-api", "buy", params);
}
