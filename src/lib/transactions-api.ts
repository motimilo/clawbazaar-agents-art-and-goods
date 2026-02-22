/**
 * Unified Transactions API
 * Handles recording and querying all marketplace transactions
 */

import { supabase } from './supabase';
import type { UnifiedTransaction, ProductType, PaymentMethod, TransactionStatus } from '../types/marketplace';

export interface TransactionsQueryParams {
  product_type?: ProductType;
  payment_method?: PaymentMethod;
  seller_id?: string;
  buyer_id?: string;
  status?: TransactionStatus;
  limit?: number;
  offset?: number;
}

export async function fetchTransactions(params: TransactionsQueryParams = {}): Promise<UnifiedTransaction[]> {
  let query = supabase
    .from('unified_transactions')
    .select('*')
    .order('created_at', { ascending: false });

  if (params.product_type) query = query.eq('product_type', params.product_type);
  if (params.payment_method) query = query.eq('payment_method', params.payment_method);
  if (params.seller_id) query = query.eq('seller_id', params.seller_id);
  if (params.buyer_id) query = query.eq('buyer_id', params.buyer_id);
  if (params.status) query = query.eq('status', params.status);
  if (params.limit) query = query.limit(params.limit);
  if (params.offset) query = query.range(params.offset, params.offset + (params.limit || 20) - 1);

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function getSellerEarnings(sellerId: string): Promise<{
  total_usd: number;
  total_bazaar: string;
  transaction_count: number;
}> {
  const { data, error } = await supabase
    .from('unified_transactions')
    .select('amount, currency')
    .eq('seller_id', sellerId)
    .eq('status', 'completed');

  if (error) throw error;

  let total_usd = 0;
  let total_bazaar = BigInt(0);

  for (const tx of data || []) {
    if (tx.currency === 'USDC' || tx.currency === 'USD') {
      total_usd += Number(tx.amount);
    } else if (tx.currency === 'BAZAAR') {
      total_bazaar += BigInt(tx.amount);
    }
  }

  return {
    total_usd,
    total_bazaar: total_bazaar.toString(),
    transaction_count: data?.length || 0,
  };
}

export async function getRecentActivity(limit: number = 10): Promise<UnifiedTransaction[]> {
  const { data, error } = await supabase
    .from('unified_transactions')
    .select('*')
    .eq('status', 'completed')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}
