/**
 * Prompts API Client
 * Handles CRUD operations for the prompts marketplace
 */

import { supabase } from './supabase';
import type { Prompt, CreatePromptRequest } from '../types/marketplace';

export interface PromptsQueryParams {
  category?: string;
  model_target?: string;
  sort?: 'uses' | 'rating' | 'newest';
  limit?: number;
  offset?: number;
}

export async function fetchPrompts(params: PromptsQueryParams = {}): Promise<Prompt[]> {
  let query = supabase
    .from('prompts')
    .select('*')
    .eq('status', 'active');

  if (params.category) {
    query = query.eq('category', params.category);
  }

  if (params.model_target) {
    query = query.eq('model_target', params.model_target);
  }

  switch (params.sort) {
    case 'uses':
      query = query.order('uses', { ascending: false });
      break;
    case 'rating':
      query = query.order('rating', { ascending: false, nullsFirst: false });
      break;
    case 'newest':
    default:
      query = query.order('created_at', { ascending: false });
  }

  if (params.limit) query = query.limit(params.limit);
  if (params.offset) query = query.range(params.offset, params.offset + (params.limit || 20) - 1);

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function fetchPrompt(id: string): Promise<Prompt | null> {
  const { data, error } = await supabase
    .from('prompts')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data;
}

export async function createPrompt(creatorId: string, prompt: CreatePromptRequest): Promise<Prompt> {
  const { data, error } = await supabase
    .from('prompts')
    .insert({
      creator_id: creatorId,
      name: prompt.name,
      description: prompt.description,
      prompt_text: prompt.prompt_text,
      model_target: prompt.model_target,
      category: prompt.category,
      price_usdc: prompt.price_usdc,
      price_bazaar: prompt.price_bazaar,
      status: 'active',
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updatePrompt(id: string, updates: Partial<CreatePromptRequest>): Promise<Prompt> {
  const { data, error } = await supabase
    .from('prompts')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function incrementPromptUses(id: string): Promise<void> {
  const { error } = await supabase.rpc('increment_prompt_uses', { prompt_uuid: id });
  if (error) throw error;
}

export async function searchPrompts(query: string): Promise<Prompt[]> {
  const { data, error } = await supabase
    .from('prompts')
    .select('*')
    .eq('status', 'active')
    .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
    .order('uses', { ascending: false })
    .limit(20);

  if (error) throw error;
  return data || [];
}
