import { useState, useEffect } from 'react';
import { X, Coins, AlertCircle, CheckCircle, Loader2, Wallet, ExternalLink, AlertTriangle, ArrowRight } from 'lucide-react';
import { parseUnits } from 'viem';
import { useWallet } from '../contexts/WalletContext';
import { supabase } from '../lib/supabase';
import { useBuyNFT, useApproveToken, useTokenAllowance, useNFTContract } from '../hooks/useNFT';
import { getTxUrl, SUPPORTED_CHAIN_ID } from '../contracts/config';
import type { Artwork, Agent } from '../types/database';

interface BuyModalProps {
  artwork: Artwork;
  agent: Agent | null;
  onClose: () => void;
  onSuccess: () => void;
}

type PurchaseStep = 'idle' | 'approving' | 'buying' | 'confirming' | 'success' | 'error';

export function BuyModal({ artwork, agent, onClose, onSuccess }: BuyModalProps) {
  const { address, isConnected, balance, connect, isCorrectNetwork, switchToBase, chainId } = useWallet();
  const [step, setStep] = useState<PurchaseStep>('idle');
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const { contractAddress } = useNFTContract();
  const { allowance, refetch: refetchAllowance } = useTokenAllowance(address || undefined, contractAddress);
  const {
    approve,
    isPending: isApprovePending,
    isConfirming: isApproveConfirming,
    isSuccess: isApproveSuccess,
    error: approveError,
  } = useApproveToken();

  const {
    buyArtwork,
    hash: buyHash,
    isPending: isBuyPending,
    isConfirming: isBuyConfirming,
    isSuccess: isBuySuccess,
    error: buyError,
    reset: resetBuy,
  } = useBuyNFT();

  const price = artwork.price_bzaar || 0;
  const priceWei = parseUnits(price.toString(), 18);
  const hasEnoughBalance = balance >= price;
  const hasApproval = BigInt(allowance) >= priceWei;
  const isMinted = artwork.nft_status === 'minted' && artwork.token_id !== null;

  useEffect(() => {
    if (isApproveSuccess) {
      refetchAllowance();
      setStep('buying');
      if (artwork.token_id !== null) {
        buyArtwork(artwork.token_id);
      }
    }
  }, [isApproveSuccess, artwork.token_id]);

  useEffect(() => {
    if (isBuySuccess && buyHash) {
      setTxHash(buyHash);
      setStep('success');
      updateDatabase(buyHash);
    }
  }, [isBuySuccess, buyHash]);

  useEffect(() => {
    if (approveError) {
      setError(approveError.message || 'Approval failed');
      setStep('error');
    }
  }, [approveError]);

  useEffect(() => {
    if (buyError) {
      setError(buyError.message || 'Purchase failed');
      setStep('error');
    }
  }, [buyError]);

  async function updateDatabase(transactionHash: string) {
    if (!address) return;

    try {
      const { data: user } = await supabase
        .from('users')
        .select('id')
        .eq('wallet_address', address.toLowerCase())
        .maybeSingle();

      if (!user) return;

      const { data: listing } = await supabase
        .from('marketplace_listings')
        .select('id')
        .eq('artwork_id', artwork.id)
        .eq('status', 'active')
        .maybeSingle();

      if (listing) {
        await supabase.from('marketplace_transactions').insert({
          listing_id: listing.id,
          buyer_type: 'user',
          buyer_user_id: user.id,
          price_paid: price,
          tx_hash: transactionHash,
        });

        await supabase
          .from('marketplace_listings')
          .update({ status: 'sold', sold_at: new Date().toISOString() })
          .eq('id', listing.id);
      }

      await supabase
        .from('artworks')
        .update({
          is_for_sale: false,
          current_owner_type: 'user',
          current_owner_id: user.id,
        })
        .eq('id', artwork.id);

      if (artwork.token_id !== null) {
        await supabase.from('nft_transfers').insert({
          artwork_id: artwork.id,
          token_id: artwork.token_id,
          from_address: agent?.handle || 'unknown',
          to_address: address.toLowerCase(),
          tx_hash: transactionHash,
        });
      }

      setTimeout(() => {
        onSuccess();
        onClose();
      }, 3000);
    } catch (err) {
      console.error('Failed to update database:', err);
    }
  }

  async function handlePurchase() {
    if (!isConnected || !address) {
      connect();
      return;
    }

    if (!isCorrectNetwork) {
      await switchToBase();
      return;
    }

    if (!isMinted) {
      setError('This artwork has not been minted as an NFT yet');
      setStep('error');
      return;
    }

    if (!hasEnoughBalance) {
      setError('Insufficient $BAZAAR balance');
      setStep('error');
      return;
    }

    setError(null);

    if (!hasApproval) {
      setStep('approving');
      approve(priceWei);
    } else {
      setStep('buying');
      if (artwork.token_id !== null) {
        buyArtwork(artwork.token_id);
      }
    }
  }

  function handleRetry() {
    setStep('idle');
    setError(null);
    resetBuy();
  }

  const isProcessing = step === 'approving' || step === 'buying' || step === 'confirming' ||
    isApprovePending || isApproveConfirming || isBuyPending || isBuyConfirming;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/80 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-md bg-paper border border-ink/20 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 bg-ink text-paper">
          <h2 className="font-mono text-sm font-medium tracking-wider">PURCHASE_NFT</h2>
          <button
            onClick={onClose}
            className="p-1 text-paper/70 hover:text-paper transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6">
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
              {isMinted && artwork.token_id !== null && (
                <p className="font-mono text-xs text-neutral-400 mt-1">TOKEN #{artwork.token_id}</p>
              )}
              <div className="flex items-center gap-2 mt-3">
                <Coins className="w-4 h-4 text-emerald-600" />
                <span className="font-mono text-lg font-bold text-ink">{price} $BAZAAR</span>
              </div>
            </div>
          </div>

          {!isMinted && (
            <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 mb-6">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-mono text-xs font-medium text-amber-700">NOT_YET_MINTED</p>
                <p className="text-amber-600 text-sm mt-1">Pending NFT minting on Base network</p>
              </div>
            </div>
          )}

          {!isConnected ? (
            <div className="text-center py-6">
              <Wallet className="w-10 h-10 text-neutral-300 mx-auto mb-3" />
              <p className="text-neutral-500 mb-4 text-sm">Connect wallet to purchase</p>
              <button
                onClick={connect}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-ink text-paper font-mono text-xs font-medium tracking-wider hover:bg-neutral-800 transition-colors"
              >
                <Wallet className="w-4 h-4" />
                CONNECT_WALLET
              </button>
            </div>
          ) : !isCorrectNetwork ? (
            <div className="text-center py-6">
              <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
              <p className="text-neutral-500 mb-4 text-sm">Switch to Base network</p>
              <button
                onClick={switchToBase}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-ink text-paper font-mono text-xs font-medium tracking-wider hover:bg-neutral-800 transition-colors"
              >
                SWITCH_NETWORK
              </button>
            </div>
          ) : step === 'success' ? (
            <div className="text-center py-8">
              <div className="w-14 h-14 bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-7 h-7 text-emerald-600" />
              </div>
              <h3 className="font-mono text-sm font-medium text-ink mb-2">TRANSACTION_COMPLETE</h3>
              <p className="text-neutral-500 text-sm mb-4">NFT transferred to your wallet</p>
              {txHash && (
                <a
                  href={getTxUrl(chainId || SUPPORTED_CHAIN_ID, txHash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 font-mono text-xs text-neutral-600 hover:text-ink transition-colors"
                >
                  VIEW_ON_BASESCAN
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          ) : step === 'error' ? (
            <div className="text-center py-8">
              <div className="w-14 h-14 bg-rose-50 border border-rose-200 flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-7 h-7 text-rose-600" />
              </div>
              <h3 className="font-mono text-sm font-medium text-ink mb-2">TRANSACTION_FAILED</h3>
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
              <div className="bg-white border border-ink/10 p-4 mb-6 font-mono text-xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-neutral-500">YOUR_BALANCE</span>
                  <span className="text-ink">{balance.toLocaleString()} $BAZAAR</span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-neutral-500">NFT_PRICE</span>
                  <span className="text-ink">{price} $BAZAAR</span>
                </div>
                <div className="border-t border-ink/10 my-2" />
                <div className="flex items-center justify-between">
                  <span className="text-neutral-500">BALANCE_AFTER</span>
                  <span className={hasEnoughBalance ? 'text-emerald-600' : 'text-rose-600'}>
                    {(balance - price).toLocaleString()} $BAZAAR
                  </span>
                </div>
              </div>

              {isProcessing && (
                <div className="bg-neutral-50 border border-ink/10 p-4 mb-6">
                  <div className="flex items-center gap-3">
                    <Loader2 className="w-4 h-4 text-ink animate-spin" />
                    <div>
                      <p className="font-mono text-xs font-medium text-ink">
                        {step === 'approving' || isApprovePending || isApproveConfirming
                          ? 'APPROVING_BZAAR...'
                          : 'EXECUTING_PURCHASE...'}
                      </p>
                      <p className="text-neutral-500 text-xs mt-0.5">
                        {isApprovePending || isBuyPending
                          ? 'Confirm in wallet'
                          : 'Waiting for confirmation'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {!hasEnoughBalance && (
                <div className="flex items-start gap-3 p-4 bg-rose-50 border border-rose-200 mb-6">
                  <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-mono text-xs font-medium text-rose-700">INSUFFICIENT_BALANCE</p>
                    <p className="text-rose-600 text-sm mt-1">Need {(price - balance).toLocaleString()} more $BAZAAR</p>
                  </div>
                </div>
              )}

              <button
                onClick={handlePurchase}
                disabled={!hasEnoughBalance || isProcessing || !isMinted}
                className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-ink text-paper font-mono text-xs font-medium tracking-wider hover:bg-neutral-800 disabled:bg-neutral-300 disabled:text-neutral-500 disabled:cursor-not-allowed transition-colors group"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    PROCESSING...
                  </>
                ) : (
                  <>
                    EXECUTE_PURCHASE // {price} $BAZAAR
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>

              <p className="font-mono text-[10px] text-neutral-400 text-center mt-4">
                5% burned · royalties enforced · receipts on-chain
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
