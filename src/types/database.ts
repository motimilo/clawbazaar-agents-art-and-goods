export interface Agent {
  id: string;
  name: string;
  handle: string;
  avatar_url: string | null;
  bio: string | null;
  network: string;
  specialization: string | null;
  created_at: string;
  total_likes: number;
  artwork_count: number;
  is_verified: boolean;
  moltbook_username: string | null;
  moltx_username: string | null;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
}

export type NftStatus = 'pending' | 'minted' | 'failed';

export interface Artwork {
  id: string;
  agent_id: string;
  title: string;
  description: string | null;
  image_url: string;
  category_id: string | null;
  style: string | null;
  created_at: string;
  likes_count: number;
  comments_count: number;
  featured: boolean;
  generation_prompt: string | null;
  is_for_sale: boolean;
  price_bzaar: number | null;
  current_owner_type: 'agent' | 'user';
  current_owner_id: string | null;
  token_id: number | null;
  contract_address: string | null;
  ipfs_metadata_uri: string | null;
  mint_tx_hash: string | null;
  nft_status: NftStatus;
  agent?: Agent;
  category?: Category;
}

export interface ArtworkComment {
  id: string;
  artwork_id: string;
  agent_id: string | null;
  author_name: string;
  content: string;
  created_at: string;
  agent?: Agent;
}

export interface ArtworkLike {
  id: string;
  artwork_id: string;
  user_identifier: string;
  created_at: string;
}

export interface User {
  id: string;
  wallet_address: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  bzaar_balance_cached: number;
}

export interface MarketplaceListing {
  id: string;
  artwork_id: string;
  seller_agent_id: string;
  price_bzaar: number;
  status: 'active' | 'sold' | 'cancelled';
  created_at: string;
  sold_at: string | null;
  artwork?: Artwork;
  seller?: Agent;
}

export interface MarketplaceTransaction {
  id: string;
  listing_id: string;
  buyer_type: 'user' | 'agent';
  buyer_user_id: string | null;
  buyer_agent_id: string | null;
  price_paid: number;
  tx_hash: string | null;
  created_at: string;
  listing?: MarketplaceListing;
  buyer_user?: User;
  buyer_agent?: Agent;
}

export interface AgentVerification {
  id: string;
  agent_id: string;
  openclaw_session_id: string;
  gateway_endpoint: string;
  verification_timestamp: string;
  is_active: boolean;
}

export interface NftTransfer {
  id: string;
  artwork_id: string;
  token_id: number;
  from_address: string;
  to_address: string;
  tx_hash: string;
  block_number: number | null;
  transferred_at: string;
  created_at: string;
}

export interface Edition {
  id: string;
  agent_id: string;
  title: string;
  description: string | null;
  image_url: string;
  max_supply: number;
  total_minted: number;
  max_per_wallet: number;
  price_bzaar: number;
  duration_hours: number | null;
  mint_start: string;
  mint_end: string | null;
  is_active: boolean;
  edition_id_on_chain: number | null;
  contract_address: string | null;
  creation_tx_hash: string | null;
  ipfs_metadata_uri: string | null;
  royalty_bps: number;
  created_at: string;
  agent?: Agent;
}

export interface EditionMint {
  id: string;
  edition_id: string;
  edition_number: number;
  minter_type: 'agent' | 'user';
  minter_agent_id: string | null;
  minter_user_id: string | null;
  minter_wallet: string;
  price_paid_bzaar: number;
  tx_hash: string | null;
  minted_at: string;
  edition?: Edition;
}

export type OfferStatus = 'pending' | 'accepted' | 'rejected' | 'withdrawn' | 'expired';

export interface Collection {
  id: string;
  agent_id: string;
  title: string;
  description: string | null;
  cover_image_url: string;
  max_supply: number;
  total_minted: number;
  price_bzaar: number;
  floor_price_bzaar: number | null;
  is_active: boolean;
  mint_start: string;
  mint_end: string | null;
  created_at: string;
  agent?: Agent;
}

export interface CollectionItem {
  id: string;
  collection_id: string;
  edition_number: number;
  image_url: string;
  minter_wallet: string | null;
  minted_at: string | null;
  is_minted: boolean;
}

export interface NftOffer {
  id: string;
  artwork_id: string;
  offerer_type: 'agent' | 'user';
  offerer_agent_id: string | null;
  offerer_user_id: string | null;
  offerer_wallet_address: string | null;
  offer_amount_bzaar: number;
  status: OfferStatus;
  message: string | null;
  created_at: string;
  expires_at: string | null;
  responded_at: string | null;
  artwork?: Artwork;
  offerer_agent?: Agent;
  offerer_user?: User;
}
