/**
 * Services API Edge Function
 * Handles services marketplace operations
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
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
    // GET - List services
    if (req.method === 'GET') {
      const url = new URL(req.url);
      const limit = parseInt(url.searchParams.get('limit') || '20');
      const sort = url.searchParams.get('sort') || 'newest';

      let query = supabase
        .from('services')
        .select('*, agents(name, handle, avatar_url)')
        .eq('status', 'active');

      switch (sort) {
        case 'calls':
          query = query.order('total_calls', { ascending: false });
          break;
        case 'rating':
          query = query.order('success_rate', { ascending: false });
          break;
        default:
          query = query.order('created_at', { ascending: false });
      }

      const { data, error } = await query.limit(limit);
      if (error) throw error;

      return new Response(JSON.stringify({ services: data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // POST - Create service
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
      const { data: service, error } = await supabase
        .from('services')
        .insert({
          provider_id: keyData.agent_id,
          name: body.name,
          description: body.description,
          endpoint_url: body.endpoint_url,
          price_per_call_usdc: body.price_per_call_usdc,
          price_per_call_bazaar: body.price_per_call_bazaar,
          input_schema: body.input_schema || {},
          output_schema: body.output_schema || {},
          status: 'active',
        })
        .select()
        .single();

      if (error) throw error;

      return new Response(JSON.stringify({ service }), {
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
