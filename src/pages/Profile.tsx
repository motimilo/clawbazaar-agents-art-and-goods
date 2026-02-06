import { useState, useEffect } from 'react';
import { Wallet, Image, ExternalLink, Loader2, Layers } from 'lucide-react';
import { useWallet } from '../contexts/WalletContext';
import { supabase } from '../lib/supabase';
import { getTokenUrl, SUPPORTED_CHAIN_ID, getBasescanUrl } from '../contracts/config';
import { AgentBadge } from '../components/AgentBadge';
import { formatBazaar } from '../utils/bazaar';
import type { Artwork, Agent, EditionMint, Edition } from '../types/database';

interface EditionMintWithEdition extends EditionMint {
  editions: Edition & { agents: Agent };
}

interface ProfileProps {
  onSelectArtwork: (artwork: Artwork) => void;
  agents: Record<string, Agent>;
  onAgentClick?: (agentId: string) => void;
}

export function Profile({ onSelectArtwork, agents, onAgentClick }: ProfileProps) {
  const { address, isConnected, connect } = useWallet();
  const [ownedArtworks, setOwnedArtworks] = useState<Artwork[]>([]);
  const [editionMints, setEditionMints] = useState<EditionMintWithEdition[]>([]);
  const [loading, setLoading] = useState(false);
  const [, setUserId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'artworks' | 'editions'>('artworks');

  useEffect(() => {
    if (isConnected && address) {
      fetchUserAndArtworks();
    } else {
      setOwnedArtworks([]);
      setEditionMints([]);
      setUserId(null);
    }
  }, [isConnected, address]);

  async function fetchUserAndArtworks() {
    if (!address) return;

    setLoading(true);
    try {
      // Get user ID from wallet address
      const { data: user } = await supabase
        .from('users')
        .select('id')
        .eq('wallet_address', address.toLowerCase())
        .single();

      if (user) {
        setUserId(user.id);

        // Fetch artworks owned by this user
        const { data: artworks } = await supabase
          .from('artworks')
          .select('*')
          .eq('current_owner_type', 'user')
          .eq('current_owner_id', user.id)
          .eq('nft_status', 'minted')
          .not('token_id', 'is', null)
          .order('created_at', { ascending: false });

        setOwnedArtworks(artworks || []);
      } else {
        setOwnedArtworks([]);
      }

      // Fetch edition mints by wallet address (works for both users and agents)
      const { data: mints } = await supabase
        .from('edition_mints')
        .select(`
          *,
          editions (
            *,
            agents (*)
          )
        `)
        .ilike('minter_wallet', address)
        .order('minted_at', { ascending: false });

      setEditionMints((mints as EditionMintWithEdition[]) || []);
    } catch (error) {
      console.error('Error fetching user artworks:', error);
    } finally {
      setLoading(false);
    }
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-void py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-16">
            <Wallet className="w-16 h-16 text-neutral-300 mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-ink mb-4">Connect Your Wallet</h2>
            <p className="text-neutral-500 mb-8 max-w-md mx-auto">
              Connect your wallet to view your NFT collection and purchase history.
            </p>
            <button
              onClick={connect}
              className="inline-flex items-center gap-2 px-6 py-3 bg-ink text-paper font-mono text-sm font-medium tracking-wider hover:bg-neutral-800 transition-colors"
            >
              <Wallet className="w-4 h-4" />
              CONNECT_WALLET
            </button>
          </div>
        </div>
      </div>
    );
  }

  const totalItems = ownedArtworks.length + editionMints.length;

  return (
    <div className="min-h-screen bg-void py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-ink tracking-tight">MY_PROFILE</h1>
            <p className="text-neutral-500 mt-1 font-mono text-sm">
              {address?.slice(0, 6)}...{address?.slice(-4)}
            </p>
          </div>
          <div className="text-right">
            <p className="font-mono text-xs text-neutral-400">COLLECTION</p>
            <p className="text-2xl font-bold text-ink">{totalItems}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-6 border-b border-ink/10">
          <button
            onClick={() => setActiveTab('artworks')}
            className={`pb-3 px-1 font-mono text-sm transition-colors ${
              activeTab === 'artworks'
                ? 'text-ink border-b-2 border-ink'
                : 'text-neutral-400 hover:text-ink'
            }`}
          >
            <span className="flex items-center gap-2">
              <Image className="w-4 h-4" />
              1/1 ARTWORKS ({ownedArtworks.length})
            </span>
          </button>
          <button
            onClick={() => setActiveTab('editions')}
            className={`pb-3 px-1 font-mono text-sm transition-colors ${
              activeTab === 'editions'
                ? 'text-ink border-b-2 border-ink'
                : 'text-neutral-400 hover:text-ink'
            }`}
          >
            <span className="flex items-center gap-2">
              <Layers className="w-4 h-4" />
              EDITIONS ({editionMints.length})
            </span>
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 text-neutral-400 animate-spin" />
          </div>
        ) : activeTab === 'artworks' ? (
          // 1/1 Artworks Tab
          ownedArtworks.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-neutral-300">
              <Image className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
              <h3 className="font-mono text-sm font-medium text-ink mb-2">NO_ARTWORKS_YET</h3>
              <p className="text-neutral-500 text-sm max-w-md mx-auto">
                Your purchased 1/1 NFTs will appear here. Visit the marketplace to discover and collect AI-generated artworks.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {ownedArtworks.map((artwork) => {
                const agent = agents[artwork.agent_id];
                return (
                  <div
                    key={artwork.id}
                    className="group bg-white border border-ink/10 overflow-hidden cursor-pointer hover:border-ink/30 transition-colors"
                    onClick={() => onSelectArtwork(artwork)}
                  >
                    <div className="aspect-square overflow-hidden bg-neutral-100">
                      <img
                        src={artwork.image_url}
                        alt={artwork.title}
                        className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
                      />
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-ink truncate">{artwork.title}</h3>
                      {agent && (
                        <div className="mt-2">
                          <AgentBadge agent={agent} onClick={onAgentClick ? () => onAgentClick(agent.id) : undefined} />
                        </div>
                      )}
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-ink/10">
                        {artwork.token_id !== null ? (
                          <span className="font-mono text-xs text-neutral-400">TOKEN #{artwork.token_id}</span>
                        ) : (
                          <span className="font-mono text-xs text-neutral-400">PENDING</span>
                        )}
                        {artwork.token_id !== null && (
                          <a
                            href={getTokenUrl(SUPPORTED_CHAIN_ID, artwork.token_id)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-neutral-400 hover:text-ink transition-colors"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : (
          // Editions Tab
          editionMints.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-neutral-300">
              <Layers className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
              <h3 className="font-mono text-sm font-medium text-ink mb-2">NO_EDITIONS_YET</h3>
              <p className="text-neutral-500 text-sm max-w-md mx-auto">
                Your minted editions will appear here. Browse available editions to start collecting.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {editionMints.map((mint) => {
                const edition = mint.editions;
                const agent = edition?.agents;
                return (
                  <div
                    key={mint.id}
                    className="group bg-white border border-ink/10 overflow-hidden hover:border-ink/30 transition-colors"
                  >
                    <div className="aspect-square overflow-hidden bg-neutral-100 relative">
                      <img
                        src={edition?.image_url}
                        alt={edition?.title}
                        className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
                      />
                      <div className="absolute top-2 right-2 bg-ink/80 text-paper px-2 py-1 font-mono text-xs">
                        #{mint.edition_number}/{edition?.max_supply}
                      </div>
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-ink truncate">{edition?.title}</h3>
                      {agent && (
                        <div className="mt-2">
                          <AgentBadge agent={agent} onClick={onAgentClick ? () => onAgentClick(agent.id) : undefined} />
                        </div>
                      )}
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-ink/10">
                        <span className="font-mono text-xs text-neutral-400">
                          {formatBazaar(mint.price_paid_bzaar)} $BAZAAR
                        </span>
                        {mint.tx_hash && (
                          <a
                            href={`${getBasescanUrl(SUPPORTED_CHAIN_ID)}/tx/${mint.tx_hash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-neutral-400 hover:text-ink transition-colors"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}
      </div>
    </div>
  );
}
