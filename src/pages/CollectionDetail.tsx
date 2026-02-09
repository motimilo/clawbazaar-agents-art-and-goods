import { useState, useEffect } from 'react';
import { ArrowLeft, Clock, Users, Coins, ArrowRight, ExternalLink, Share2, Folder, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { formatBazaar, normalizeBazaarAmount } from '../utils/bazaar';
import { useWallet } from '../contexts/WalletContext';
import type { Collection, CollectionItem, Agent } from '../types/database';

interface CollectionDetailProps {
  collectionId: string;
  onBack: () => void;
  onAgentClick?: (agentId: string) => void;
}

export function CollectionDetail({ collectionId, onBack, onAgentClick }: CollectionDetailProps) {
  const [collection, setCollection] = useState<Collection | null>(null);
  const [items, setItems] = useState<CollectionItem[]>([]);
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [minting, setMinting] = useState(false);
  const [mintQuantity, setMintQuantity] = useState(1);
  const [copied, setCopied] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<string | null>(null);
  const { isConnected, connect } = useWallet();

  useEffect(() => {
    fetchCollection();
    fetchItems();
  }, [collectionId]);

  useEffect(() => {
    if (!collection?.mint_end) return;

    const updateTime = () => {
      const end = new Date(collection.mint_end!).getTime();
      const now = Date.now();
      const diff = end - now;

      if (diff <= 0) {
        setTimeRemaining('Ended');
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      if (hours > 24) {
        const days = Math.floor(hours / 24);
        setTimeRemaining(`${days}d ${hours % 24}h`);
      } else if (hours > 0) {
        setTimeRemaining(`${hours}h ${minutes}m`);
      } else {
        setTimeRemaining(`${minutes}m`);
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, [collection?.mint_end]);

  async function fetchCollection() {
    const { data } = await supabase
      .from('collections')
      .select('*')
      .eq('id', collectionId)
      .single();

    if (data) {
      setCollection(data);
      fetchAgent(data.agent_id);
    }
    setLoading(false);
  }

  async function fetchAgent(agentId: string) {
    const { data } = await supabase
      .from('agents')
      .select('*')
      .eq('id', agentId)
      .single();
    
    if (data) setAgent(data);
  }

  async function fetchItems() {
    const { data } = await supabase
      .from('collection_items')
      .select('*')
      .eq('collection_id', collectionId)
      .order('edition_number', { ascending: true });
    
    if (data) setItems(data);
  }

  async function handleMint() {
    if (!isConnected) {
      connect();
      return;
    }

    setMinting(true);
    try {
      // TODO: Implement actual minting logic with smart contract
      // For now, simulate a mint
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Refresh data after mint
      await fetchCollection();
      await fetchItems();
    } catch (error) {
      console.error('Mint failed:', error);
    } finally {
      setMinting(false);
    }
  }

  function handleShare() {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-paper py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <LoadingSpinner size="lg" text="Loading collection..." />
        </div>
      </div>
    );
  }

  if (!collection) {
    return (
      <div className="min-h-screen bg-paper py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-20">
            <Folder className="w-16 h-16 text-neutral-300 mx-auto mb-4" />
            <h2 className="font-mono text-lg text-ink">// COLLECTION_NOT_FOUND</h2>
            <p className="text-neutral-500 mt-2">This collection doesn't exist or has been removed.</p>
            <button
              onClick={onBack}
              className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-ink text-paper font-mono text-xs"
            >
              <ArrowLeft className="w-4 h-4" />
              BACK_TO_COLLECTIONS
            </button>
          </div>
        </div>
      </div>
    );
  }

  const progress = (collection.total_minted / collection.max_supply) * 100;
  const remaining = collection.max_supply - collection.total_minted;
  const isSoldOut = remaining === 0;
  const isEnded = collection.mint_end && new Date(collection.mint_end) < new Date();
  const canMint = collection.is_active && !isSoldOut && !isEnded;
  const maxMintable = Math.min(remaining, 10); // Max 10 per tx
  const totalCost = normalizeBazaarAmount(collection.price_bzaar) * mintQuantity;

  return (
    <div className="min-h-screen bg-paper py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back button */}
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-neutral-500 hover:text-ink transition-colors mb-6 font-mono text-xs"
        >
          <ArrowLeft className="w-4 h-4" />
          BACK_TO_COLLECTIONS
        </button>

        {/* Hero Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {/* Cover Image */}
          <div className="relative aspect-square bg-neutral-100 border border-ink/10 overflow-hidden">
            <img
              src={collection.cover_image_url}
              alt={collection.title}
              className="w-full h-full object-cover"
            />
            {/* Status badges */}
            <div className="absolute top-4 left-4 flex flex-col gap-2">
              <span className="font-mono text-[10px] font-medium tracking-wider bg-white px-3 py-1.5 border border-ink/10 flex items-center gap-1.5">
                <Folder className="w-3.5 h-3.5" />
                COLLECTION
              </span>
              {isSoldOut && (
                <span className="font-mono text-[10px] font-medium tracking-wider bg-ink text-paper px-3 py-1.5">
                  SOLD_OUT
                </span>
              )}
              {isEnded && !isSoldOut && (
                <span className="font-mono text-[10px] font-medium tracking-wider bg-neutral-800 text-paper px-3 py-1.5">
                  MINT_ENDED
                </span>
              )}
            </div>
          </div>

          {/* Info Panel */}
          <div className="flex flex-col">
            {/* Title & Creator */}
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-ink tracking-tight mb-3">{collection.title}</h1>
              {agent && (
                <button
                  onClick={() => onAgentClick?.(agent.id)}
                  className="flex items-center gap-3 group"
                >
                  {agent.avatar_url ? (
                    <img
                      src={agent.avatar_url}
                      alt={agent.name}
                      className="w-10 h-10 rounded-full object-cover border-2 border-ink/10 group-hover:border-ink/30 transition-colors"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-neutral-200 flex items-center justify-center border-2 border-ink/10">
                      <span className="text-sm font-bold text-neutral-500">{agent.name.charAt(0).toUpperCase()}</span>
                    </div>
                  )}
                  <div className="text-left">
                    <p className="text-sm font-medium text-ink group-hover:underline">{agent.name}</p>
                    <p className="font-mono text-xs text-neutral-500">@{agent.handle}</p>
                  </div>
                </button>
              )}
            </div>

            {/* Description */}
            {collection.description && (
              <p className="text-neutral-600 mb-6 leading-relaxed">{collection.description}</p>
            )}

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-white border border-ink/10">
              <div className="border-l-4 border-teal-500 pl-3">
                <p className="font-mono text-[10px] text-neutral-500 tracking-wider">TOTAL_SUPPLY</p>
                <p className="font-mono text-xl font-bold text-ink">{collection.max_supply}</p>
              </div>
              <div className="border-l-4 border-lime-500 pl-3">
                <p className="font-mono text-[10px] text-neutral-500 tracking-wider">MINTED</p>
                <p className="font-mono text-xl font-bold text-ink">{collection.total_minted}</p>
              </div>
              <div className="border-l-4 border-yellow-500 pl-3">
                <p className="font-mono text-[10px] text-neutral-500 tracking-wider">REMAINING</p>
                <p className="font-mono text-xl font-bold text-ink">{remaining}</p>
              </div>
              {collection.floor_price_bzaar && collection.total_minted > 0 && (
                <div className="border-l-4 border-orange-500 pl-3">
                  <p className="font-mono text-[10px] text-neutral-500 tracking-wider">FLOOR_PRICE</p>
                  <p className="font-mono text-xl font-bold text-ink">{formatBazaar(collection.floor_price_bzaar)}</p>
                </div>
              )}
            </div>

            {/* Progress Bar */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5 text-neutral-500">
                  <Users className="w-4 h-4" />
                  <span className="font-mono text-xs">{progress.toFixed(1)}% minted</span>
                </div>
                {timeRemaining && (
                  <div className="flex items-center gap-1.5 text-neutral-500">
                    <Clock className="w-4 h-4" />
                    <span className="font-mono text-xs">{timeRemaining}</span>
                  </div>
                )}
              </div>
              <div className="w-full h-2 bg-neutral-100 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${
                    isSoldOut ? 'bg-ink' : 'bg-teal-500'
                  }`}
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/* Mint Section */}
            {canMint && (
              <div className="bg-white border border-ink/10 p-4 mb-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="font-mono text-[10px] text-neutral-500 tracking-wider">MINT_PRICE</p>
                    <div className="flex items-center gap-2">
                      <Coins className="w-5 h-5 text-teal-600" />
                      <span className="font-mono text-2xl font-bold text-ink">
                        {formatBazaar(collection.price_bzaar)} $BAZAAR
                      </span>
                    </div>
                  </div>
                </div>

                {/* Quantity selector */}
                <div className="flex items-center gap-3 mb-4">
                  <span className="font-mono text-xs text-neutral-500">QTY:</span>
                  <div className="flex items-center border border-ink/10">
                    <button
                      onClick={() => setMintQuantity(Math.max(1, mintQuantity - 1))}
                      className="px-3 py-2 font-mono text-ink hover:bg-neutral-50 transition-colors"
                      disabled={mintQuantity <= 1}
                    >
                      -
                    </button>
                    <span className="px-4 py-2 font-mono text-ink border-x border-ink/10">{mintQuantity}</span>
                    <button
                      onClick={() => setMintQuantity(Math.min(maxMintable, mintQuantity + 1))}
                      className="px-3 py-2 font-mono text-ink hover:bg-neutral-50 transition-colors"
                      disabled={mintQuantity >= maxMintable}
                    >
                      +
                    </button>
                  </div>
                  <span className="font-mono text-xs text-neutral-400">max {maxMintable}</span>
                </div>

                {/* Total & Mint button */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-mono text-[10px] text-neutral-500 tracking-wider">TOTAL</p>
                    <p className="font-mono text-lg font-bold text-ink">{formatBazaar(totalCost)} $BAZAAR</p>
                  </div>
                  <button
                    onClick={handleMint}
                    disabled={minting}
                    className="flex items-center gap-2 px-6 py-3 bg-teal-600 text-white font-mono text-sm font-medium tracking-wider hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {minting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        MINTING...
                      </>
                    ) : (
                      <>
                        MINT_NOW
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleShare}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-ink/10 font-mono text-xs text-ink hover:border-ink/30 transition-colors"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Share2 className="w-4 h-4" />}
                {copied ? 'COPIED!' : 'SHARE'}
              </button>
              <button className="flex items-center gap-2 px-4 py-2 bg-white border border-ink/10 font-mono text-xs text-ink hover:border-ink/30 transition-colors">
                <ExternalLink className="w-4 h-4" />
                VIEW_CONTRACT
              </button>
            </div>
          </div>
        </div>

        {/* Items Grid */}
        <div className="border-t border-ink/10 pt-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-mono text-sm font-medium text-ink tracking-wider flex items-center gap-2">
              <span>COLLECTION_ITEMS</span>
              <span className="text-neutral-400">({items.length})</span>
            </h2>
            <div className="flex items-center gap-2 text-neutral-500">
              <span className="w-3 h-3 rounded-full bg-teal-500" />
              <span className="font-mono text-xs">MINTED</span>
              <span className="w-3 h-3 rounded-full bg-neutral-200 ml-2" />
              <span className="font-mono text-xs">AVAILABLE</span>
            </div>
          </div>

          {items.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {items.map((item) => (
                <div
                  key={item.id}
                  className={`relative aspect-square bg-neutral-100 border overflow-hidden transition-all ${
                    item.is_minted
                      ? 'border-teal-500/30 opacity-75'
                      : 'border-ink/10 hover:border-ink/30 hover:shadow-md cursor-pointer'
                  }`}
                >
                  <img
                    src={item.image_url || collection.cover_image_url}
                    alt={`#${item.edition_number}`}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-ink/80 to-transparent p-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs text-white">#{item.edition_number}</span>
                      {item.is_minted && (
                        <span className="w-2 h-2 rounded-full bg-teal-400" />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white border border-ink/10 p-8 text-center">
              <p className="font-mono text-sm text-neutral-500">
                // Items will appear here as they are minted
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
