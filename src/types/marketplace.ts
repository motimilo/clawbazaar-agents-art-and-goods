/**
 * CLAWBAZAAR Marketplace Types
 * Generated for the expansion (skills, services, prompts)
 */

export type ProductStatus = 'active' | 'inactive' | 'pending' | 'rejected';
export type ProductType = 'art' | 'edition' | 'skill' | 'service' | 'prompt';
export type PaymentMethod = 'x402' | 'bazaar' | 'fiat';
export type TransactionStatus = 'pending' | 'completed' | 'failed' | 'refunded';

export interface Skill {
  id: string;
  creator_id: string;
  name: string;
  description?: string;
  version: string;
  package_url: string;
  package_hash: string;
  price_usdc?: number;
  price_bazaar?: string;
  category?: string;
  tags: string[];
  downloads: number;
  rating?: number;
  status: ProductStatus;
  created_at: string;
  updated_at: string;
}

export interface Service {
  id: string;
  provider_id: string;
  name: string;
  description?: string;
  endpoint_url: string;
  price_per_call_usdc?: number;
  price_per_call_bazaar?: string;
  input_schema: Record<string, unknown>;
  output_schema: Record<string, unknown>;
  avg_response_time_ms?: number;
  success_rate?: number;
  total_calls: number;
  status: ProductStatus;
  created_at: string;
  updated_at: string;
}

export interface Prompt {
  id: string;
  creator_id: string;
  name: string;
  description?: string;
  prompt_text: string;
  model_target?: string;
  category?: string;
  price_usdc?: number;
  price_bazaar?: string;
  uses: number;
  rating?: number;
  status: ProductStatus;
  created_at: string;
  updated_at: string;
}

export interface UnifiedTransaction {
  id: string;
  product_type: ProductType;
  product_id: string;
  buyer_id?: string;
  buyer_wallet?: string;
  seller_id: string;
  payment_method: PaymentMethod;
  amount: number;
  currency: string;
  tx_hash?: string;
  chain?: string;
  x402_receipt?: Record<string, unknown>;
  platform_fee?: number;
  creator_royalty?: number;
  status: TransactionStatus;
  created_at: string;
}

export interface AgentWallet {
  id: string;
  agent_id: string;
  chain: string;
  address: string;
  is_primary: boolean;
  is_verified: boolean;
  created_at: string;
}

// API Request/Response types
export interface CreateSkillRequest {
  name: string;
  description?: string;
  version?: string;
  package_url: string;
  package_hash: string;
  price_usdc?: number;
  price_bazaar?: string;
  category?: string;
  tags?: string[];
}

export interface CreateServiceRequest {
  name: string;
  description?: string;
  endpoint_url: string;
  price_per_call_usdc?: number;
  price_per_call_bazaar?: string;
  input_schema?: Record<string, unknown>;
  output_schema?: Record<string, unknown>;
}

export interface CreatePromptRequest {
  name: string;
  description?: string;
  prompt_text: string;
  model_target?: string;
  category?: string;
  price_usdc?: number;
  price_bazaar?: string;
}

export interface ServiceCallRequest {
  input: Record<string, unknown>;
}

export interface ServiceCallResponse {
  output: Record<string, unknown>;
  execution_time_ms: number;
  cost: {
    amount: number;
    currency: string;
  };
}

// x402 Payment types
export interface X402PaymentHeader {
  token: string;
  amount: string;
  currency: string;
  recipient: string;
  signature: string;
}

export interface X402PaymentReceipt {
  payment_hash: string;
  amount: string;
  currency: string;
  recipient: string;
  timestamp: string;
  verified: boolean;
}
