/**
 * Unified Payments API
 * Supports: Fiat (Stripe), Crypto (x402, $BAZAAR)
 */

import { supabase } from './supabase';
import type { UnifiedTransaction } from '../types/marketplace';

export type PaymentMethod = 'fiat' | 'x402' | 'bazaar';

export interface PaymentConfig {
  stripePk?: string;
  x402Enabled: boolean;
  bazaarEnabled: boolean;
  fiatEnabled: boolean;
}

// Payment config - could be fetched from env/API
export const PAYMENT_CONFIG: PaymentConfig = {
  stripePk: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY,
  x402Enabled: true,
  bazaarEnabled: true,
  fiatEnabled: !!import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY,
};

/**
 * Format price display based on currency
 */
export function formatPrice(
  amount: number | null | undefined,
  currency: 'USDC' | 'BAZAAR' | 'USD'
): string {
  if (amount === null || amount === undefined) return 'Free';
  if (amount === 0) return 'Free';
  
  switch (currency) {
    case 'USD':
    case 'USDC':
      return `$${amount.toFixed(2)}`;
    case 'BAZAAR':
      return `${amount.toLocaleString()} $BAZAAR`;
    default:
      return `${amount}`;
  }
}

/**
 * Get available payment methods for a product
 */
export function getAvailablePaymentMethods(
  priceUsdc?: number | null,
  priceBazaar?: number | null
): PaymentMethod[] {
  const methods: PaymentMethod[] = [];
  
  // Free items - just download
  if ((!priceUsdc || priceUsdc === 0) && (!priceBazaar || priceBazaar === 0)) {
    return [];
  }
  
  // Fiat (USD via Stripe)
  if (PAYMENT_CONFIG.fiatEnabled && priceUsdc && priceUsdc > 0) {
    methods.push('fiat');
  }
  
  // x402 stablecoin micropayments
  if (PAYMENT_CONFIG.x402Enabled && priceUsdc && priceUsdc > 0) {
    methods.push('x402');
  }
  
  // $BAZAAR token
  if (PAYMENT_CONFIG.bazaarEnabled && priceBazaar && priceBazaar > 0) {
    methods.push('bazaar');
  }
  
  return methods;
}

/**
 * Create a Stripe checkout session for fiat payment
 */
export async function createStripeCheckout(params: {
  productType: 'skill' | 'service' | 'prompt';
  productId: string;
  productName: string;
  priceUsdc: number;
  buyerEmail?: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<{ checkoutUrl: string }> {
  // Call our API to create Stripe session
  const response = await fetch('/api/payments/stripe/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  
  if (!response.ok) {
    throw new Error('Failed to create checkout session');
  }
  
  return response.json();
}

/**
 * Process x402 stablecoin payment
 */
export async function processX402Payment(params: {
  productType: 'skill' | 'service' | 'prompt';
  productId: string;
  sellerId: string;
  amount: number;
  payerWallet: string;
}): Promise<{ txHash: string }> {
  // x402 payment flow
  // 1. Request payment invoice from server
  // 2. User approves USDC transfer
  // 3. Transaction confirmed
  // 4. Return tx hash
  
  const response = await fetch('/api/payments/x402/pay', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  
  if (!response.ok) {
    throw new Error('Failed to process x402 payment');
  }
  
  return response.json();
}

/**
 * Process $BAZAAR token payment
 */
export async function processBazaarPayment(params: {
  productType: 'skill' | 'service' | 'prompt';
  productId: string;
  sellerId: string;
  amount: number;
  payerWallet: string;
}): Promise<{ txHash: string }> {
  // $BAZAAR payment flow
  // 1. Check user's BAZAAR balance
  // 2. Transfer BAZAAR to seller
  // 3. Record transaction
  
  const response = await fetch('/api/payments/bazaar/pay', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  
  if (!response.ok) {
    throw new Error('Failed to process BAZAAR payment');
  }
  
  return response.json();
}

/**
 * Record transaction in unified ledger
 */
export async function recordTransaction(params: {
  productType: 'art' | 'edition' | 'skill' | 'service' | 'prompt';
  productId: string;
  buyerId?: string;
  buyerWallet?: string;
  sellerId: string;
  paymentMethod: PaymentMethod;
  amount: number;
  currency: 'USDC' | 'BAZAAR' | 'USD';
  txHash?: string;
  chain?: string;
  platformFee?: number;
  creatorRoyalty?: number;
}): Promise<UnifiedTransaction> {
  const { data, error } = await supabase
    .from('unified_transactions')
    .insert({
      product_type: params.productType,
      product_id: params.productId,
      buyer_id: params.buyerId,
      buyer_wallet: params.buyerWallet,
      seller_id: params.sellerId,
      payment_method: params.paymentMethod,
      amount: params.amount,
      currency: params.currency,
      tx_hash: params.txHash,
      chain: params.chain,
      platform_fee: params.platformFee,
      creator_royalty: params.creatorRoyalty,
      status: 'completed',
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get payment badge info for UI
 */
export function getPaymentBadge(method: PaymentMethod): {
  label: string;
  color: string;
  icon: string;
} {
  switch (method) {
    case 'fiat':
      return { label: 'Card', color: 'blue', icon: '💳' };
    case 'x402':
      return { label: 'USDC', color: 'green', icon: '⚡' };
    case 'bazaar':
      return { label: '$BAZAAR', color: 'amber', icon: '🦀' };
    default:
      return { label: 'Unknown', color: 'gray', icon: '?' };
  }
}
