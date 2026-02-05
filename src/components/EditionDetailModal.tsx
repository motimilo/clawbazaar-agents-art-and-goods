import { useState, useEffect } from 'react';
import { X, Layers, Clock, Users, Coins, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { WalletBadge } from './WalletBadge';
import { AgentBadge } from './AgentBadge';
import { formatBazaar } from '../utils/bazaar';
import type { Edition, Agent, EditionMint } from '../types/database';

interface EditionMintWithDetails extends EditionMint {
  agents?: Agent;
  users?: { id: string; wallet_address: string };
}

interface EditionDetailModalProps {
  edition: Edition;
  agent: Agent | null;
  onClose: () => void;
  onMint?: () => void;
  onAgentClick: (agentId: string) => void;
  onWalletClick: (address: string) => void;
  agents: Record<string, Agent>;
}

const COLLECTORS_PER_PAGE = 10;

export function EditionDetailModal({
  edition,
  agent,
  onClose,
  onMint,
  onAgentClick,
  onWalletClick,
  agents,
}: EditionDetailModalProps) {
  const [collectors, setCollectors] = useState<EditionMintWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCollectors, setTotalCollectors] = useState(0);

  const remaining = edition.max_supply - edition.total_minted;
  const isSoldOut = remaining === 0;
  const isExpired = edition.mint_end ? new Date(edition.mint_end).getTime() < Date.now() : false;
  const canMint = edition.is_active && !isSoldOut && !isExpired;

  const totalPages = Math.ceil(totalCollectors / COLLECTORS_PER_PAGE);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    fetchCollectors();

    return () => {
      document.body.style.overflow = '';
    };
  }, [edition.id, currentPage]);

  async function fetchCollectors() {
    setLoading(true);
    try {
      const { data: allMints } = await supabase
        .from('edition_mints')
        .select(`
          *,
          agents (id, name, handle, avatar_url),
          users (id, wallet_address)
        `)
        .eq('edition_id', edition.id)
        .order('minted_at', { ascending: false });

      if (allMints) {
        const uniqueCollectors = new Map<string, EditionMintWithDetails>();

        for (const mint of allMints as EditionMintWithDetails[]) {
          const key = mint.minter_wallet.toLowerCase();
          if (!uniqueCollectors.has(key)) {
            uniqueCollectors.set(key, mint);
          }
        }

        const uniqueMintsArray = Array.from(uniqueCollectors.values());
        setTotalCollectors(uniqueMintsArray.length);

        const startIndex = (currentPage - 1) * COLLECTORS_PER_PAGE;
        const endIndex = startIndex + COLLECTORS_PER_PAGE;
        setCollectors(uniqueMintsArray.slice(startIndex, endIndex));
      } else {
        setTotalCollectors(0);
        setCollectors([]);
      }
    } catch (error) {
      console.error('Error fetching collectors:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleDownload() {
    try {
      const response = await fetch(edition.image_url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${edition.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.png`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download failed:', error);
    }
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/80 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-6xl max-h-[90vh] bg-white overflow-hidden flex flex-col lg:flex-row border border-ink/20">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 bg-white border border-ink/10 text-ink hover:bg-neutral-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="lg:w-3/5 bg-neutral-100 flex items-center justify-center border-r border-ink/10 relative">
          <img
            src={edition.image_url}
            alt={edition.title}
            className="max-w-full max-h-[60vh] lg:max-h-[90vh] object-contain"
          />
          <button
            onClick={handleDownload}
            className="absolute bottom-4 right-4 p-3 bg-white border border-ink/10 text-ink hover:bg-neutral-100 transition-colors"
            title="Download artwork"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>

        <div className="lg:w-2/5 flex flex-col max-h-[90vh] lg:max-h-none bg-white">
          <div className="p-6 border-b border-ink/10">
            <div className="flex items-center gap-2 mb-4">
              <Layers className="w-4 h-4 text-ink" />
              <span className="font-mono text-xs font-medium tracking-wider text-ink">EDITION</span>
            </div>

            <h2 className="text-2xl font-bold text-ink mb-2">{edition.title}</h2>

            {agent && (
              <AgentBadge agent={agent} onClick={() => onAgentClick(agent.id)} />
            )}

            {edition.description && (
              <p className="text-neutral-600 mt-4 leading-relaxed text-sm">{edition.description}</p>
            )}

            <div className="mt-4 p-4 bg-white border border-ink/10">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5 text-neutral-500">
                  <Users className="w-4 h-4" />
                  <span className="font-mono text-xs">{edition.total_minted}/{edition.max_supply}</span>
                </div>
                {edition.mint_end && (
                  <div className="flex items-center gap-1.5 text-neutral-500">
                    <Clock className="w-4 h-4" />
                    <span className="font-mono text-xs">{isExpired ? 'Ended' : 'Active'}</span>
                  </div>
                )}
              </div>

              <div className="w-full h-2 bg-neutral-100 rounded-full overflow-hidden mb-3">
                <div
                  className={`h-full transition-all ${isSoldOut ? 'bg-ink' : 'bg-emerald-500'}`}
                  style={{ width: `${(edition.total_minted / edition.max_supply) * 100}%` }}
                />
              </div>

              <div className="flex items-center gap-2">
                <Coins className="w-4 h-4 text-emerald-600" />
                <span className="font-mono text-lg font-bold text-ink">{formatBazaar(edition.price_bzaar)} $BAZAAR</span>
              </div>
            </div>

            {canMint && onMint && (
              <button
                onClick={onMint}
                className="w-full flex items-center justify-center gap-2 mt-4 px-6 py-4 bg-ink text-paper font-mono text-xs font-medium tracking-wider hover:bg-neutral-800 transition-colors"
              >
                <Layers className="w-4 h-4" />
                MINT_EDITION // {formatBazaar(edition.price_bzaar)} $BAZAAR
              </button>
            )}

            {isSoldOut && (
              <div className="mt-4 p-4 bg-neutral-100 border border-neutral-200">
                <p className="font-mono text-xs font-medium text-neutral-700">SOLD_OUT</p>
                <p className="text-neutral-500 text-sm mt-1">This edition has reached maximum supply</p>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-6 bg-neutral-50">
            <h3 className="font-mono text-xs font-medium text-neutral-600 tracking-wider mb-4">
              COLLECTORS ({totalCollectors})
            </h3>

            {loading ? (
              <div className="text-center py-8">
                <div className="inline-block w-6 h-6 border-2 border-neutral-300 border-t-ink rounded-full animate-spin" />
              </div>
            ) : collectors.length === 0 ? (
              <p className="text-neutral-500 text-sm text-center py-8 font-mono">
                // NO_COLLECTORS_YET
              </p>
            ) : (
              <>
                <div className="space-y-3 mb-4">
                  {collectors.map((mint) => {
                    const collectorAgent = mint.minter_agent_id ? agents[mint.minter_agent_id] : null;
                    return (
                      <div key={mint.id} className="bg-white border border-ink/10 p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {collectorAgent ? (
                              <AgentBadge
                                agent={collectorAgent}
                                onClick={() => onAgentClick(collectorAgent.id)}
                              />
                            ) : (
                              <WalletBadge
                                address={mint.minter_wallet}
                                onClick={() => onWalletClick(mint.minter_wallet)}
                              />
                            )}
                          </div>
                          <span className="font-mono text-xs text-neutral-400">
                            #{mint.edition_number}
                          </span>
                        </div>
                        <p className="font-mono text-[10px] text-neutral-400">
                          {formatDate(mint.minted_at)}
                        </p>
                      </div>
                    );
                  })}
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center justify-between pt-4 border-t border-ink/10">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="flex items-center gap-1 px-3 py-2 bg-white border border-ink/10 text-ink font-mono text-xs hover:border-ink/30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      PREV
                    </button>
                    <span className="font-mono text-xs text-neutral-500">
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="flex items-center gap-1 px-3 py-2 bg-white border border-ink/10 text-ink font-mono text-xs hover:border-ink/30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      NEXT
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
