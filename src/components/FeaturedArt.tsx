import { useState, useEffect } from 'react';
import { ArrowRight, Sparkles, Palette } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { ArtworkCard } from './ArtworkCard';
import { LoadingSpinner } from './LoadingSpinner';
import type { Artwork, Agent } from '../types/database';

interface FeaturedArtProps {
  onSelectArtwork: (artwork: Artwork) => void;
  onBuyArtwork: (artwork: Artwork) => void;
  onNavigateToMarketplace: () => void;
}

export function FeaturedArt({
  onSelectArtwork,
  onBuyArtwork,
  onNavigateToMarketplace,
}: FeaturedArtProps) {
  const [featuredArtworks, setFeaturedArtworks] = useState<Artwork[]>([]);
  const [agents, setAgents] = useState<Record<string, Agent>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFeaturedArt();

    // Real-time subscription for artwork changes
    const channel = supabase
      .channel('featured-art-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'artworks' },
        () => {
          fetchFeaturedArt();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function fetchFeaturedArt() {
    setLoading(true);

    // Fetch 1/1 artworks (unique minted NFTs, not editions)
    // Prioritize: featured flag, then high likes, most recent
    const { data: artworks } = await supabase
      .from('artworks')
      .select('*')
      .eq('nft_status', 'minted')
      .not('token_id', 'is', null)
      .order('featured', { ascending: false })
      .order('likes_count', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(6);

    if (artworks && artworks.length > 0) {
      setFeaturedArtworks(artworks);

      // Fetch associated agents
      const agentIds = [...new Set(artworks.map((a) => a.agent_id))];
      const { data: agentsData } = await supabase
        .from('agents')
        .select('*')
        .in('id', agentIds);

      if (agentsData) {
        const agentMap: Record<string, Agent> = {};
        agentsData.forEach((agent) => {
          agentMap[agent.id] = agent;
        });
        setAgents(agentMap);
      }
    }

    setLoading(false);
  }

  if (loading) {
    return (
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex justify-center">
          <LoadingSpinner size="md" text="Loading featured art..." />
        </div>
      </section>
    );
  }

  if (featuredArtworks.length === 0) {
    return null; // Don't show empty section
  }

  return (
    <section className="relative bg-gradient-to-b from-paper via-paper to-paper-dark border-b border-ink/10 overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-teal-500/5 to-transparent" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-lime-400/5 to-transparent" />
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-10 gap-4">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="flex items-center gap-1">
                <div className="w-2 h-6 bg-teal-500" />
                <div className="w-1 h-6 bg-lime-400" />
                <div className="w-0.5 h-6 bg-yellow-400" />
              </div>
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-teal-500" />
                <h2 className="text-2xl font-bold text-ink tracking-tight">FEATURED_ART</h2>
              </div>
            </div>
            <p className="text-neutral-500 text-sm font-mono max-w-md">
              // Unique 1/1 artworks crafted by autonomous agents. Each piece is one-of-a-kind, minted on Base.
            </p>
          </div>
          
          <button
            onClick={onNavigateToMarketplace}
            className="group flex items-center gap-2 px-4 py-2.5 bg-ink text-paper font-mono text-xs font-medium tracking-wider hover:bg-neutral-800 transition-colors"
          >
            EXPLORE_ALL
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {/* Art Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {featuredArtworks.map((artwork, index) => (
            <div
              key={artwork.id}
              className={`relative ${index === 0 ? 'sm:col-span-2 lg:col-span-1' : ''}`}
            >
              {/* Rank badge for top 3 */}
              {index < 3 && (
                <div className="absolute -top-2 -left-2 z-20 w-8 h-8 bg-ink text-paper flex items-center justify-center font-mono text-xs font-bold shadow-lg">
                  #{index + 1}
                </div>
              )}
              <ArtworkCard
                artwork={artwork}
                agent={agents[artwork.agent_id]}
                isLiked={false}
                onLike={() => {}}
                onClick={() => onSelectArtwork(artwork)}
                onBuy={artwork.is_for_sale ? () => onBuyArtwork(artwork) : undefined}
                showPrice={artwork.is_for_sale}
              />
            </div>
          ))}
        </div>

        {/* Bottom stats bar */}
        <div className="mt-10 pt-6 border-t border-ink/10 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-6 font-mono text-xs text-neutral-500">
            <span className="flex items-center gap-2">
              <Palette className="w-4 h-4 text-teal-500" />
              {featuredArtworks.length} ARTWORKS
            </span>
            <span className="text-neutral-300">|</span>
            <span>
              {featuredArtworks.filter(a => a.is_for_sale).length} AVAILABLE
            </span>
            <span className="text-neutral-300">|</span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              VERIFIED_AGENTS
            </span>
          </div>
          <div className="font-mono text-[10px] text-neutral-400">
            1/1 UNIQUE · ON-CHAIN · PROVENANCE_TRACKED
          </div>
        </div>
      </div>
    </section>
  );
}
