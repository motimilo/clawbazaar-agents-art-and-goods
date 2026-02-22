/**
 * Services API Client
 * Handles CRUD operations for the agent services marketplace
 */

import { supabase, SUPABASE_FUNCTIONS_URL } from './supabase';
import type { Service, CreateServiceRequest, ServiceCallRequest, ServiceCallResponse } from '../types/marketplace';

export interface ServicesQueryParams {
  category?: string;
  sort?: 'calls' | 'success_rate' | 'newest';
  limit?: number;
  offset?: number;
}

/**
 * Fetch all active services with optional filters
 */
export async function fetchServices(params: ServicesQueryParams = {}): Promise<Service[]> {
  let query = supabase
    .from('services')
    .select('*')
    .eq('status', 'active');

  switch (params.sort) {
    case 'calls':
      query = query.order('total_calls', { ascending: false });
      break;
    case 'success_rate':
      query = query.order('success_rate', { ascending: false, nullsFirst: false });
      break;
    case 'newest':
    default:
      query = query.order('created_at', { ascending: false });
  }

  if (params.limit) {
    query = query.limit(params.limit);
  }

  if (params.offset) {
    query = query.range(params.offset, params.offset + (params.limit || 20) - 1);
  }

  const { data, error } = await query;
  
  if (error) throw error;
  return data || [];
}

/**
 * Fetch a single service by ID
 */
export async function fetchService(id: string): Promise<Service | null> {
  const { data, error } = await supabase
    .from('services')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data;
}

/**
 * Fetch services by provider
 */
export async function fetchServicesByProvider(providerId: string): Promise<Service[]> {
  const { data, error } = await supabase
    .from('services')
    .select('*')
    .eq('provider_id', providerId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Create a new service listing
 */
export async function createService(
  providerId: string,
  service: CreateServiceRequest
): Promise<Service> {
  const { data, error } = await supabase
    .from('services')
    .insert({
      provider_id: providerId,
      name: service.name,
      description: service.description,
      endpoint_url: service.endpoint_url,
      price_per_call_usdc: service.price_per_call_usdc,
      price_per_call_bazaar: service.price_per_call_bazaar,
      input_schema: service.input_schema || {},
      output_schema: service.output_schema || {},
      status: 'active',
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update a service listing
 */
export async function updateService(
  id: string,
  updates: Partial<CreateServiceRequest>
): Promise<Service> {
  const { data, error } = await supabase
    .from('services')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Call a service via the proxy gateway
 * This handles x402 payment verification
 */
export async function callService(
  serviceId: string,
  request: ServiceCallRequest,
  paymentHeader?: string
): Promise<ServiceCallResponse> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (paymentHeader) {
    headers['X-PAYMENT'] = paymentHeader;
  }

  const response = await fetch(`${SUPABASE_FUNCTIONS_URL}/service-proxy/${serviceId}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(request),
  });

  if (response.status === 402) {
    // Payment required - return the payment info
    const paymentInfo = await response.json();
    throw new Error(`Payment required: ${JSON.stringify(paymentInfo)}`);
  }

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Service call failed');
  }

  return response.json();
}

/**
 * Get service health/stats
 */
export async function getServiceStats(serviceId: string): Promise<{
  total_calls: number;
  success_rate: number | null;
  avg_response_time_ms: number | null;
}> {
  const { data, error } = await supabase
    .from('services')
    .select('total_calls, success_rate, avg_response_time_ms')
    .eq('id', serviceId)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Search services by name or description
 */
export async function searchServices(query: string): Promise<Service[]> {
  const { data, error } = await supabase
    .from('services')
    .select('*')
    .eq('status', 'active')
    .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
    .order('total_calls', { ascending: false })
    .limit(20);

  if (error) throw error;
  return data || [];
}
