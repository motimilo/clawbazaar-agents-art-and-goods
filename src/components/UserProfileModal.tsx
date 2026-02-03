import { useState, useEffect } from 'react';
import { X, Wallet, Image, Loader2, Layers, ExternalLink } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getTokenUrl, SUPPORTED_CHAIN_ID, getBasescanUrl } from '../contracts/config';
import { WalletBadge } from './WalletBadge';
import type { Artwork, Agent, EditionMint, Edition } from '../types/database';

interface EditionMintWithEdition extends EditionMint {
  editions: Edition & { agents: Agent };
}

interface UserProfileModalProps {
  walletAddress: string;
  onClose: () => void;
  onSelectArtwork: (artwork: Artwork) => void;
  agents: Record<string, Agent>;
}

export function UserProfileModal({ walletAddress, onClose, onSelectArtwork, agents }: UserProfileModalProps) {
  const [ownedArtworks, setOwnedArtworks] = useState<Artwork[]>([]);
  const [editionMints, setEditionMints] = useState<EditionMintWithEdition[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'artworks' | 'editions'>('artworks');

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    fetchUserArtworks();

    return () => {
      document.body.style.overflow = '';
    };
  }, [walletAddress]);

  async function fetchUserArtworks() {
    setLoading(true);
    try {
      const { data: user } = await supabase
        .from('users')
        .select('id')
        .eq('wallet_address', walletAddress.toLowerCase())
        .maybeSingle();

      if (user) {
        const { data: artworks } = await supabase
          .from('artworks')
          .select('*')
          .eq('current_owner_type', 'user')
          .eq('current_owner_id', user.id)
          .order('created_at', { ascending: false });

        setOwnedArtworks(artworks || []);
      } else {
        setOwnedArtworks([]);
      }

      const { data: mints } = await supabase
        .from('edition_mints')
        .select(`
          *,
          editions!inner (
            *,
            agents (*)
          )
        `)
        .eq('minter_wallet', walletAddress.toLowerCase())
        .order('minted_at', { ascending: false });

      if (mints) {
        const uniqueMints = mints.filter((mint, index, self) =>
          index === self.findIndex((m) => m.id === mint.id)
        );
        setEditionMints(uniqueMints as EditionMintWithEdition[]);
      } else {
        setEditionMints([]);
      }
    } catch (error) {
      console.error('Error fetching user artworks:', error);
    } finally {
      setLoading(false);
    }
  }

  const totalItems = ownedArtworks.length + editionMints.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/80 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-5xl max-h-[90vh] bg-paper overflow-hidden flex flex-col border border-ink/20">
        <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-ink/10">
          <div className="flex items-center gap-3">
            <Wallet className="w-5 h-5 text-ink" />
            <div>
              <h2 className="text-xl font-bold text-ink">USER_PROFILE</h2>
              <WalletBadge address={walletAddress} showCopy />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="font-mono text-xs text-neutral-400">COLLECTION</p>
              <p className="text-lg font-bold text-ink">{totalItems}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-neutral-500 hover:text-ink transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex gap-4 px-6 py-3 border-b border-ink/10 bg-white">
          <button
            onClick={() => setActiveTab('artworks')}
            className={`pb-2 px-1 font-mono text-sm transition-colors ${
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
            className={`pb-2 px-1 font-mono text-sm transition-colors ${
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

        <div className="flex-1 overflow-y-auto p-6 bg-neutral-50">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 text-neutral-400 animate-spin" />
            </div>
          ) : activeTab === 'artworks' ? (
            ownedArtworks.length === 0 ? (
              <div className="text-center py-16">
                <Image className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
                <p className="font-mono text-sm text-neutral-500">NO_ARTWORKS</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
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
                      <div className="p-3">
                        <h3 className="font-semibold text-ink text-sm truncate">{artwork.title}</h3>
                        {agent && (
                          <p className="font-mono text-xs text-neutral-500 mt-1">by @{agent.handle}</p>
                        )}
                        {artwork.token_id !== null && (
                          <a
                            href={getTokenUrl(SUPPORTED_CHAIN_ID, artwork.token_id)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 mt-2 text-neutral-400 hover:text-ink transition-colors"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <span className="font-mono text-xs">#{artwork.token_id}</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            editionMints.length === 0 ? (
              <div className="text-center py-16">
                <Layers className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
                <p className="font-mono text-sm text-neutral-500">NO_EDITIONS</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
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
                      <div className="p-3">
                        <h3 className="font-semibold text-ink text-sm truncate">{edition?.title}</h3>
                        {agent && (
                          <p className="font-mono text-xs text-neutral-500 mt-1">by @{agent.handle}</p>
                        )}
                        {mint.tx_hash && (
                          <a
                            href={`${getBasescanUrl(SUPPORTED_CHAIN_ID)}/tx/${mint.tx_hash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 mt-2 text-neutral-400 hover:text-ink transition-colors"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <span className="font-mono text-xs">{mint.price_paid_bzaar} $BAZAAR</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
