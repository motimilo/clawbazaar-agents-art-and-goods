/**
 * Skills API Client
 * Handles CRUD operations for the skills marketplace
 */

import { supabase } from './supabase';
import type { Skill, CreateSkillRequest } from '../types/marketplace';

export interface SkillsQueryParams {
  category?: string;
  sort?: 'downloads' | 'rating' | 'newest';
  limit?: number;
  offset?: number;
}

/**
 * Fetch all active skills with optional filters
 */
export async function fetchSkills(params: SkillsQueryParams = {}): Promise<Skill[]> {
  let query = supabase
    .from('skills')
    .select('*')
    .eq('status', 'active');

  if (params.category) {
    query = query.eq('category', params.category);
  }

  switch (params.sort) {
    case 'downloads':
      query = query.order('downloads', { ascending: false });
      break;
    case 'rating':
      query = query.order('rating', { ascending: false, nullsFirst: false });
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
 * Fetch a single skill by ID
 */
export async function fetchSkill(id: string): Promise<Skill | null> {
  const { data, error } = await supabase
    .from('skills')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw error;
  }
  return data;
}

/**
 * Fetch skills by creator
 */
export async function fetchSkillsByCreator(creatorId: string): Promise<Skill[]> {
  const { data, error } = await supabase
    .from('skills')
    .select('*')
    .eq('creator_id', creatorId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Create a new skill listing
 */
export async function createSkill(
  creatorId: string,
  skill: CreateSkillRequest
): Promise<Skill> {
  const { data, error } = await supabase
    .from('skills')
    .insert({
      creator_id: creatorId,
      name: skill.name,
      description: skill.description,
      version: skill.version || '1.0.0',
      package_url: skill.package_url,
      package_hash: skill.package_hash,
      price_usdc: skill.price_usdc,
      price_bazaar: skill.price_bazaar,
      category: skill.category,
      tags: skill.tags || [],
      status: 'active',
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update a skill listing
 */
export async function updateSkill(
  id: string,
  updates: Partial<CreateSkillRequest>
): Promise<Skill> {
  const { data, error } = await supabase
    .from('skills')
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
 * Increment download count (called after successful purchase)
 */
export async function incrementSkillDownloads(id: string): Promise<void> {
  const { error } = await supabase.rpc('increment_skill_downloads', {
    skill_uuid: id,
  });
  if (error) throw error;
}

/**
 * Get skill categories with counts
 */
export async function fetchSkillCategories(): Promise<{ category: string; count: number }[]> {
  const { data, error } = await supabase
    .from('skills')
    .select('category')
    .eq('status', 'active')
    .not('category', 'is', null);

  if (error) throw error;

  // Count by category
  const counts: Record<string, number> = {};
  for (const skill of data || []) {
    if (skill.category) {
      counts[skill.category] = (counts[skill.category] || 0) + 1;
    }
  }

  return Object.entries(counts)
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Search skills by name or description
 */
export async function searchSkills(query: string): Promise<Skill[]> {
  const { data, error } = await supabase
    .from('skills')
    .select('*')
    .eq('status', 'active')
    .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
    .order('downloads', { ascending: false })
    .limit(20);

  if (error) throw error;
  return data || [];
}
