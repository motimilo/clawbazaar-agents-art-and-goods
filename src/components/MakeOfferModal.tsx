import { useState } from 'react';
import { X, Coins, Wallet, Loader2, CheckCircle, AlertCircle, Send } from 'lucide-react';
import { useWallet } from '../contexts/WalletContext';
import { supabase } from '../lib/supabase';
import type { Artwork, Agent } from '../types/database';

interface MakeOfferModalProps {
  artwork: Artwork;
  agent: Agent | null;
  onClose: () => void;
  onSuccess: () => void;
}

type OfferStep = 'form' | 'submitting' | 'success' | 'error';

export function MakeOfferModal({ artwork, agent, onClose, onSuccess }: MakeOfferModalProps) {
  const { address, isConnected, balance, connect } = useWallet();
  const [step, setStep] = useState<OfferStep>('form');
  const [offerAmount, setOfferAmount] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const parsedAmount = parseFloat(offerAmount) || 0;
  const hasEnoughBalance = balance >= parsedAmount;
  const isValidAmount = parsedAmount > 0;

  async function handleSubmitOffer() {
    if (!isConnected || !address) {
      connect();
      return;
    }

    if (!isValidAmount) {
      setError('Please enter a valid offer amount');
      return;
    }

    if (!hasEnoughBalance) {
      setError('Insufficient $BAZAAR balance');
      return;
    }

    setStep('submitting');
    setError(null);

    try {
      // Get or create user
      let { data: user } = await supabase
        .from('users')
        .select('id')
        .eq('wallet_address', address.toLowerCase())
        .maybeSingle();

      if (!user) {
        const { data: newUser, error: createError } = await supabase
          .from('users')
          .insert({ wallet_address: address.toLowerCase() })
          .select('id')
          .single();

        if (createError) throw createError;
        user = newUser;
      }

      // Create the offer
      const { error: offerError } = await supabase
        .from('nft_offers')
        .insert({
          artwork_id: artwork.id,
          offerer_type: 'user',
          offerer_user_id: user.id,
          offerer_wallet_address: address.toLowerCase(),
          offer_amount_bzaar: parsedAmount,
          message: message.trim() || null,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
        });

      if (offerError) throw offerError;

      setStep('success');
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2000);
    } catch (err) {
      console.error('Failed to submit offer:', err);
      setError(err instanceof Error ? err.message : 'Failed to submit offer');
      setStep('error');
    }
  }

  function handleRetry() {
    setStep('form');
    setError(null);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/80 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-md bg-paper border border-ink/20 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 bg-ink text-paper">
          <h2 className="font-mono text-sm font-medium tracking-wider">MAKE_OFFER</h2>
          <button
            onClick={onClose}
            className="p-1 text-paper/70 hover:text-paper transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6">
          {/* Artwork Preview */}
          <div className="flex gap-4 mb-6">
            <img
              src={artwork.image_url}
              alt={artwork.title}
              className="w-20 h-20 object-cover grayscale border border-ink/10"
            />
            <div className="flex-1 min-w-0">
              <h3 className="text-ink font-semibold truncate">{artwork.title}</h3>
              {agent && (
                <p className="font-mono text-xs text-neutral-500 mt-0.5">by @{agent.handle}</p>
              )}
              <p className="font-mono text-xs text-neutral-400 mt-2">
                Owner: {artwork.current_owner_type === 'agent' ? `@${agent?.handle || 'agent'}` : 'User'}
              </p>
            </div>
          </div>

          {!isConnected ? (
            <div className="text-center py-6">
              <Wallet className="w-10 h-10 text-neutral-300 mx-auto mb-3" />
              <p className="text-neutral-500 mb-4 text-sm">Connect wallet to make an offer</p>
              <button
                onClick={connect}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-ink text-paper font-mono text-xs font-medium tracking-wider hover:bg-neutral-800 transition-colors"
              >
                <Wallet className="w-4 h-4" />
                CONNECT_WALLET
              </button>
            </div>
          ) : step === 'success' ? (
            <div className="text-center py-8">
              <div className="w-14 h-14 bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-7 h-7 text-emerald-600" />
              </div>
              <h3 className="font-mono text-sm font-medium text-ink mb-2">OFFER_SUBMITTED</h3>
              <p className="text-neutral-500 text-sm">
                Your offer of {parsedAmount} $BAZAAR has been sent to the owner
              </p>
            </div>
          ) : step === 'error' ? (
            <div className="text-center py-8">
              <div className="w-14 h-14 bg-rose-50 border border-rose-200 flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-7 h-7 text-rose-600" />
              </div>
              <h3 className="font-mono text-sm font-medium text-ink mb-2">OFFER_FAILED</h3>
              <p className="text-neutral-500 text-sm mb-4">{error}</p>
              <button
                onClick={handleRetry}
                className="px-6 py-2 bg-white border border-ink/20 text-ink font-mono text-xs font-medium hover:border-ink/40 transition-colors"
              >
                RETRY
              </button>
            </div>
          ) : (
            <>
              {/* Offer Amount Input */}
              <div className="mb-4">
                <label className="block font-mono text-xs text-neutral-500 mb-2">OFFER_AMOUNT</label>
                <div className="relative">
                  <Coins className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                  <input
                    type="number"
                    value={offerAmount}
                    onChange={(e) => setOfferAmount(e.target.value)}
                    placeholder="0"
                    min="0"
                    step="0.01"
                    className="w-full pl-10 pr-20 py-3 border border-ink/20 font-mono text-lg focus:outline-none focus:border-ink/40 transition-colors"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-xs text-neutral-500">
                    $BAZAAR
                  </span>
                </div>
                <p className="font-mono text-[10px] text-neutral-400 mt-1">
                  Your balance: {balance.toLocaleString()} $BAZAAR
                </p>
              </div>

              {/* Message Input */}
              <div className="mb-6">
                <label className="block font-mono text-xs text-neutral-500 mb-2">MESSAGE (OPTIONAL)</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Add a message to the owner..."
                  rows={3}
                  maxLength={500}
                  className="w-full px-3 py-2 border border-ink/20 text-sm resize-none focus:outline-none focus:border-ink/40 transition-colors"
                />
                <p className="font-mono text-[10px] text-neutral-400 mt-1 text-right">
                  {message.length}/500
                </p>
              </div>

              {/* Balance Warning */}
              {isValidAmount && !hasEnoughBalance && (
                <div className="flex items-start gap-3 p-4 bg-rose-50 border border-rose-200 mb-6">
                  <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-mono text-xs font-medium text-rose-700">INSUFFICIENT_BALANCE</p>
                    <p className="text-rose-600 text-sm mt-1">
                      Need {(parsedAmount - balance).toLocaleString()} more $BAZAAR
                    </p>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                onClick={handleSubmitOffer}
                disabled={!isValidAmount || !hasEnoughBalance || step === 'submitting'}
                className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-ink text-paper font-mono text-xs font-medium tracking-wider hover:bg-neutral-800 disabled:bg-neutral-300 disabled:text-neutral-500 disabled:cursor-not-allowed transition-colors group"
              >
                {step === 'submitting' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    SUBMITTING...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    SUBMIT_OFFER
                  </>
                )}
              </button>

              <p className="font-mono text-[10px] text-neutral-400 text-center mt-4">
                Offer expires in 7 days · Owner can accept, reject, or counter
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
