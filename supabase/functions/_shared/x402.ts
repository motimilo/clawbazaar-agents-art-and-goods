/**
 * x402 Payment Verification
 * Shared utilities for HTTP 402 payment handling
 */

export interface X402PaymentInfo {
  price: string;
  currency: string;
  recipient: string;
  description: string;
  payment_hash?: string;
}

export interface X402PaymentHeader {
  token: string;
  amount: string;
  currency: string;
  recipient: string;
  signature: string;
  tx_hash?: string;
}

/**
 * Parse X-PAYMENT header
 */
export function parsePaymentHeader(header: string | null): X402PaymentHeader | null {
  if (!header) return null;
  
  try {
    // x402 uses base64-encoded JSON
    const decoded = atob(header);
    return JSON.parse(decoded);
  } catch {
    // Try raw JSON
    try {
      return JSON.parse(header);
    } catch {
      return null;
    }
  }
}

/**
 * Verify x402 payment
 * In production, this would verify the on-chain transaction
 */
export async function verifyPayment(
  payment: X402PaymentHeader,
  expectedAmount: string,
  expectedCurrency: string,
  expectedRecipient: string
): Promise<{ valid: boolean; error?: string }> {
  // Basic validation
  if (payment.amount !== expectedAmount) {
    return { valid: false, error: 'Amount mismatch' };
  }
  
  if (payment.currency !== expectedCurrency) {
    return { valid: false, error: 'Currency mismatch' };
  }
  
  if (payment.recipient.toLowerCase() !== expectedRecipient.toLowerCase()) {
    return { valid: false, error: 'Recipient mismatch' };
  }

  // TODO: Verify on-chain transaction via tx_hash
  // For now, trust the signature (in production, verify crypto signature)
  if (!payment.signature || payment.signature.length < 10) {
    return { valid: false, error: 'Invalid signature' };
  }

  return { valid: true };
}

/**
 * Create 402 Payment Required response
 */
export function createPaymentRequiredResponse(info: X402PaymentInfo): Response {
  return new Response(
    JSON.stringify({
      error: 'Payment Required',
      code: 'payment_required',
      payment: info,
    }),
    {
      status: 402,
      headers: {
        'Content-Type': 'application/json',
        'X-Payment-Required': 'true',
        'X-Price': info.price,
        'X-Currency': info.currency,
        'X-Recipient': info.recipient,
      },
    }
  );
}

/**
 * Create payment receipt for successful payment
 */
export function createPaymentReceipt(payment: X402PaymentHeader): object {
  return {
    payment_hash: payment.tx_hash || payment.signature,
    amount: payment.amount,
    currency: payment.currency,
    recipient: payment.recipient,
    timestamp: new Date().toISOString(),
    verified: true,
  };
}
