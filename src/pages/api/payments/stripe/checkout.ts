/**
 * Stripe Checkout API Endpoint
 * Creates a checkout session for skill/service/prompt purchases
 * 
 * Note: This is a serverless function (Vercel/Supabase Edge)
 * For client-side testing, mock this endpoint
 */

import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

interface CheckoutRequest {
  productType: 'skill' | 'service' | 'prompt';
  productId: string;
  productName: string;
  priceUsdc: number;
  buyerEmail?: string;
  successUrl: string;
  cancelUrl: string;
}

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const body: CheckoutRequest = await req.json();
    
    // Validate required fields
    if (!body.productId || !body.productName || !body.priceUsdc) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Convert price to cents (Stripe uses smallest currency unit)
    const priceInCents = Math.round(body.priceUsdc * 100);

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: body.productName,
              description: `CLAWBAZAAR ${body.productType}: ${body.productId}`,
              metadata: {
                productType: body.productType,
                productId: body.productId,
              },
            },
            unit_amount: priceInCents,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: body.successUrl + '?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: body.cancelUrl,
      customer_email: body.buyerEmail,
      metadata: {
        productType: body.productType,
        productId: body.productId,
        platform: 'clawbazaar',
      },
    });

    return new Response(JSON.stringify({ checkoutUrl: session.url }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Stripe checkout error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Checkout failed' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

/**
 * Webhook handler for Stripe events
 * Called after successful payment to:
 * 1. Record transaction in unified_transactions
 * 2. Increment download/usage count
 * 3. Grant access to the buyer
 */
export async function handleStripeWebhook(req: Request) {
  const sig = req.headers.get('stripe-signature');
  const body = await req.text();
  
  try {
    const event = stripe.webhooks.constructEvent(
      body,
      sig!,
      process.env.STRIPE_WEBHOOK_SECRET!
    );

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const metadata = session.metadata;

      // Record transaction
      // TODO: Call Supabase to record in unified_transactions
      console.log('Payment completed:', {
        productType: metadata?.productType,
        productId: metadata?.productId,
        amount: session.amount_total,
        email: session.customer_email,
      });
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(JSON.stringify({ error: 'Webhook failed' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
