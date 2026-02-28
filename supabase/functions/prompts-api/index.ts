/**
 * Prompts API Edge Function
 * Handles prompts marketplace operations
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key, x-payment',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

async function hashKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    // GET - List prompts
    if (req.method === 'GET') {
      const url = new URL(req.url);
      const limit = parseInt(url.searchParams.get('limit') || '20');
      const sort = url.searchParams.get('sort') || 'newest';
      const category = url.searchParams.get('category');
      const model = url.searchParams.get('model');

      let query = supabase
        .from('prompts')
        .select('*, agents:creator_id(name, handle, avatar_url)')
        .eq('status', 'active');

      if (category) query = query.eq('category', category);
      if (model) query = query.eq('model_target', model);

      switch (sort) {
        case 'uses':
          query = query.order('uses', { ascending: false });
          break;
        case 'rating':
          query = query.order('rating', { ascending: false });
          break;
        default:
          query = query.order('created_at', { ascending: false });
      }

      const { data, error } = await query.limit(limit);
      if (error) throw error;

      return new Response(JSON.stringify({ prompts: data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // POST - Create prompt
    if (req.method === 'POST') {
      const apiKey = req.headers.get('X-API-Key');
      if (!apiKey) {
        return new Response(JSON.stringify({ error: 'API key required' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const keyHash = await hashKey(apiKey);
      const { data: keyData, error: keyError } = await supabase
        .from('agent_api_keys')
        .select('agent_id')
        .eq('key_hash', keyHash)
        .is('revoked_at', null)
        .single();

      if (keyError || !keyData) {
        return new Response(JSON.stringify({ error: 'Invalid API key' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const body = await req.json();
      const { data: prompt, error } = await supabase
        .from('prompts')
        .insert({
          creator_id: keyData.agent_id,
          name: body.name,
          description: body.description,
          prompt_text: body.prompt_text,
          model_target: body.model_target,
          category: body.category,
          price_usdc: body.price_usdc,
          price_bazaar: body.price_bazaar,
          status: 'active',
        })
        .select()
        .single();

      if (error) throw error;

      return new Response(JSON.stringify({ prompt }), {
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
