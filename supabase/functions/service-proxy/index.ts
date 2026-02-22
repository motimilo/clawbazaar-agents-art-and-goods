/**
 * Service Proxy Edge Function
 * Routes requests to agent services with x402 micropayment verification
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';
import { parsePaymentHeader, verifyPayment, createPaymentRequiredResponse, createPaymentReceipt } from '../_shared/x402.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-payment',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const url = new URL(req.url);
  const pathParts = url.pathname.split('/').filter(Boolean);
  const serviceId = pathParts[1];

  if (!serviceId) {
    return new Response(JSON.stringify({ error: 'Service ID required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    // Get service details
    const { data: service, error: serviceError } = await supabase
      .from('services')
      .select('*, agents(name, handle, wallet_address)')
      .eq('id', serviceId)
      .eq('status', 'active')
      .single();

    if (serviceError || !service) {
      return new Response(JSON.stringify({ error: 'Service not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check x402 payment
    const paymentHeader = req.headers.get('X-PAYMENT');
    const payment = parsePaymentHeader(paymentHeader);

    if (!payment && service.price_per_call_usdc > 0) {
      // Get provider wallet
      const providerWallet = service.agents?.wallet_address || Deno.env.get('CLAWBAZAAR_WALLET');
      
      return createPaymentRequiredResponse({
        price: service.price_per_call_usdc.toString(),
        currency: 'USDC',
        recipient: providerWallet,
        description: `Call service: ${service.name}`,
      });
    }

    // Verify payment if required
    if (service.price_per_call_usdc > 0 && payment) {
      const providerWallet = service.agents?.wallet_address || Deno.env.get('CLAWBAZAAR_WALLET');
      const verification = await verifyPayment(
        payment,
        service.price_per_call_usdc.toString(),
        'USDC',
        providerWallet
      );

      if (!verification.valid) {
        return new Response(JSON.stringify({ error: verification.error }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Forward request to service endpoint
    const startTime = Date.now();
    const body = await req.json();
    
    let serviceResponse: Response;
    let wasSuccessful = false;
    let output: any;

    try {
      serviceResponse = await fetch(service.endpoint_url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Caller': 'clawbazaar-proxy',
          'X-Service-Id': serviceId,
        },
        body: JSON.stringify(body.input || body),
      });

      wasSuccessful = serviceResponse.ok;
      output = await serviceResponse.json();
    } catch (fetchError) {
      wasSuccessful = false;
      output = { error: 'Service endpoint unreachable' };
    }

    const executionTime = Date.now() - startTime;

    // Update service stats
    await supabase.rpc('increment_service_calls', {
      service_uuid: serviceId,
      response_time_ms: executionTime,
      was_successful: wasSuccessful,
    });

    // Record transaction if paid
    if (payment && service.price_per_call_usdc > 0) {
      const receipt = createPaymentReceipt(payment);
      const platformFee = service.price_per_call_usdc * 0.05; // 5% fee for services
      
      await supabase.from('unified_transactions').insert({
        product_type: 'service',
        product_id: serviceId,
        buyer_wallet: payment.recipient,
        seller_id: service.provider_id,
        payment_method: 'x402',
        amount: service.price_per_call_usdc,
        currency: 'USDC',
        tx_hash: payment.tx_hash,
        x402_receipt: receipt,
        platform_fee: platformFee,
        creator_royalty: service.price_per_call_usdc - platformFee,
        status: wasSuccessful ? 'completed' : 'failed',
      });
    }

    return new Response(JSON.stringify({
      output,
      execution_time_ms: executionTime,
      success: wasSuccessful,
      cost: service.price_per_call_usdc > 0 ? {
        amount: service.price_per_call_usdc,
        currency: 'USDC',
      } : null,
    }), {
      status: wasSuccessful ? 200 : 502,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('Service proxy error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
