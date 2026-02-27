/**
 * Skills API Edge Function
 * Handles skills marketplace operations with x402 payment support
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';
import { parsePaymentHeader, verifyPayment, createPaymentRequiredResponse, createPaymentReceipt } from '../_shared/x402.ts';

async function hashKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const CLAWBAZAAR_WALLET = Deno.env.get('CLAWBAZAAR_WALLET') || '0xdCD12A0046E1BD40Edc0125F4Fc3e2b9DAAA5F61';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-payment',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const url = new URL(req.url);
  const pathParts = url.pathname.split('/').filter(Boolean);
  
  // Remove 'skills-api' from path
  const skillId = pathParts[1];
  const action = pathParts[2];

  try {
    // GET /skills-api - List all skills
    if (req.method === 'GET' && !skillId) {
      const category = url.searchParams.get('category');
      const sort = url.searchParams.get('sort') || 'newest';
      const limit = parseInt(url.searchParams.get('limit') || '20');

      let query = supabase
        .from('skills')
        .select('*, agents(name, handle, avatar_url)')
        .eq('status', 'active');

      if (category) query = query.eq('category', category);

      switch (sort) {
        case 'downloads':
          query = query.order('downloads', { ascending: false });
          break;
        case 'rating':
          query = query.order('rating', { ascending: false });
          break;
        default:
          query = query.order('created_at', { ascending: false });
      }

      const { data, error } = await query.limit(limit);
      if (error) throw error;

      return new Response(JSON.stringify({ skills: data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // GET /skills-api/:id - Get single skill
    if (req.method === 'GET' && skillId && !action) {
      const { data, error } = await supabase
        .from('skills')
        .select('*, agents(name, handle, avatar_url)')
        .eq('id', skillId)
        .single();

      if (error) throw error;

      return new Response(JSON.stringify({ skill: data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // GET /skills-api/:id/download - Download skill (x402 protected)
    if (req.method === 'GET' && skillId && action === 'download') {
      // Get skill details
      const { data: skill, error } = await supabase
        .from('skills')
        .select('*')
        .eq('id', skillId)
        .single();

      if (error || !skill) {
        return new Response(JSON.stringify({ error: 'Skill not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Check if free
      if (!skill.price_usdc || skill.price_usdc === 0) {
        // Free skill - increment downloads and return URL
        await supabase.rpc('increment_skill_downloads', { skill_uuid: skillId });
        
        return new Response(JSON.stringify({
          download_url: skill.package_url,
          package_hash: skill.package_hash,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Check for x402 payment
      const paymentHeader = req.headers.get('X-PAYMENT');
      const payment = parsePaymentHeader(paymentHeader);

      if (!payment) {
        // Return 402 Payment Required
        return createPaymentRequiredResponse({
          price: skill.price_usdc.toString(),
          currency: 'USDC',
          recipient: CLAWBAZAAR_WALLET,
          description: `Download skill: ${skill.name}`,
        });
      }

      // Verify payment
      const verification = await verifyPayment(
        payment,
        skill.price_usdc.toString(),
        'USDC',
        CLAWBAZAAR_WALLET
      );

      if (!verification.valid) {
        return new Response(JSON.stringify({ error: verification.error }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Payment valid - record transaction
      const receipt = createPaymentReceipt(payment);
      await supabase.from('unified_transactions').insert({
        product_type: 'skill',
        product_id: skillId,
        buyer_wallet: payment.recipient, // TODO: Get buyer wallet
        seller_id: skill.creator_id,
        payment_method: 'x402',
        amount: skill.price_usdc,
        currency: 'USDC',
        tx_hash: payment.tx_hash,
        x402_receipt: receipt,
        platform_fee: skill.price_usdc * 0.1, // 10% fee
        creator_royalty: skill.price_usdc * 0.9,
        status: 'completed',
      });

      // Increment downloads
      await supabase.rpc('increment_skill_downloads', { skill_uuid: skillId });

      return new Response(JSON.stringify({
        download_url: skill.package_url,
        package_hash: skill.package_hash,
        receipt,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // POST /skills-api - Create skill (requires auth)
    if (req.method === 'POST' && !skillId) {
      const apiKey = req.headers.get('X-API-Key');
      if (!apiKey) {
        return new Response(JSON.stringify({ error: 'API key required' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Verify API key (hash it first, keys stored as SHA-256)
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
      const { data: skill, error } = await supabase
        .from('skills')
        .insert({
          creator_id: keyData.agent_id,
          name: body.name,
          description: body.description,
          version: body.version || '1.0.0',
          package_url: body.package_url,
          package_hash: body.package_hash,
          price_usdc: body.price_usdc,
          price_bazaar: body.price_bazaar,
          category: body.category,
          tags: body.tags || [],
          status: 'active',
        })
        .select()
        .single();

      if (error) throw error;

      return new Response(JSON.stringify({ skill }), {
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('Skills API error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
