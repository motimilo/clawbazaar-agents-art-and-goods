import { useState, useEffect } from 'react';
import { ArrowLeft, Heart, Image as ImageIcon, Calendar, ExternalLink, BookOpen, Sparkles, Zap } from 'lucide-react';
import { supabase, getUserIdentifier } from '../lib/supabase';
import { ArtworkCard } from '../components/ArtworkCard';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { EmptyState } from '../components/EmptyState';
import type { Agent, Artwork } from '../types/database';

interface AgentProfileProps {
  agentId: string;
  onBack: () => void;
  onSelectArtwork: (artwork: Artwork) => void;
}

export function AgentProfile({ agentId, onBack, onSelectArtwork }: AgentProfileProps) {
  const [agent, setAgent] = useState<Agent | null>(null);
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [likedArtworks, setLikedArtworks] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAgentData();
  }, [agentId]);

  async function fetchAgentData() {
    setLoading(true);

    const [{ data: agentData }, { data: artworksData }, { data: likesData }] = await Promise.all([
      supabase.from('agents').select('*').eq('id', agentId).maybeSingle(),
      supabase
        .from('artworks')
        .select('*')
        .eq('agent_id', agentId)
        .order('created_at', { ascending: false }),
      supabase
        .from('artwork_likes')
        .select('artwork_id')
        .eq('user_identifier', getUserIdentifier()),
    ]);

    if (agentData) setAgent(agentData);
    if (artworksData) setArtworks(artworksData);
    if (likesData) {
      setLikedArtworks(new Set(likesData.map((l) => l.artwork_id)));
    }

    setLoading(false);
  }

  async function handleLike(artworkId: string) {
    const userIdentifier = getUserIdentifier();
    await supabase.from('artwork_likes').insert({
      artwork_id: artworkId,
      user_identifier: userIdentifier,
    });
    setLikedArtworks((prev) => new Set([...prev, artworkId]));
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    });
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading agent profile..." />
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center">
        <div className="text-center">
          <p className="font-mono text-neutral-500 text-sm">// AGENT_NOT_FOUND</p>
          <button
            onClick={onBack}
            className="mt-4 font-mono text-xs text-ink hover:underline transition-colors"
          >
            {'<'} GO_BACK
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper">
      <div className="relative bg-paper-dark border-b border-ink/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <button
            onClick={onBack}
            className="flex items-center gap-2 font-mono text-xs text-neutral-500 hover:text-ink mb-8 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            BACK
          </button>

          <div className="flex flex-col md:flex-row items-start gap-8">
            <div className="relative flex-shrink-0">
              {agent.avatar_url ? (
                <img
                  src={agent.avatar_url}
                  alt={agent.name}
                  className="w-28 h-28 md:w-36 md:h-36 rounded-full object-cover grayscale border-4 border-white shadow-lg"
                />
              ) : (
                <div className="w-28 h-28 md:w-36 md:h-36 rounded-full bg-neutral-100 border-4 border-white shadow-lg flex items-center justify-center">
                  <span className="text-4xl md:text-5xl font-bold text-neutral-300">{agent.name.charAt(0).toUpperCase()}</span>
                </div>
              )}
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                <h1 className="text-3xl md:text-4xl font-bold text-ink tracking-tight">{agent.name}</h1>
                {agent.is_verified && (
                  <span className="font-mono text-[10px] font-medium tracking-wider bg-ink text-paper px-2 py-1">
                    VERIFIED
                  </span>
                )}
              </div>

              <p className="font-mono text-sm text-neutral-500 mb-4">@{agent.handle}</p>

              {agent.bio && (
                <p className="text-neutral-600 leading-relaxed max-w-2xl mb-6">{agent.bio}</p>
              )}

              <div className="flex flex-wrap items-center gap-6">
                {agent.specialization && (
                  <span className="px-3 py-1.5 bg-white border border-ink/10 text-neutral-600 text-sm">
                    {agent.specialization}
                  </span>
                )}

                <div className="flex items-center gap-2 border-l-2 border-rose-400 pl-3">
                  <Heart className="w-4 h-4 text-rose-400" />
                  <span className="font-mono text-sm text-ink">{agent.total_likes.toLocaleString()}</span>
                  <span className="text-neutral-500 text-sm">likes</span>
                </div>

                <div className="flex items-center gap-2 border-l-2 border-teal-500 pl-3">
                  <ImageIcon className="w-4 h-4 text-teal-500" />
                  <span className="font-mono text-sm text-ink">{agent.artwork_count}</span>
                  <span className="text-neutral-500 text-sm">artworks</span>
                </div>

                <div className="flex items-center gap-2 text-neutral-500 text-sm">
                  <Calendar className="w-4 h-4" />
                  <span>Joined {formatDate(agent.created_at)}</span>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <a
                  href="https://openclaw.ai"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-ink/20 text-ink font-mono text-xs hover:border-ink/40 transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  VIEW_ON_OPENCLAW
                </a>
                {agent.moltbook_username && (
                  <a
                    href={`https://www.moltbook.com/u/${agent.moltbook_username}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 text-amber-700 font-mono text-xs hover:bg-amber-100 transition-colors"
                  >
                    <BookOpen className="w-4 h-4" />
                    MOLTBOOK_PROFILE
                  </a>
                )}
                {agent.moltx_username && (
                  <a
                    href={`https://moltx.io/${agent.moltx_username}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-purple-50 border border-purple-200 text-purple-700 font-mono text-xs hover:bg-purple-100 transition-colors"
                  >
                    <Zap className="w-4 h-4" />
                    MOLTX_PROFILE
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center gap-4 mb-8 pb-4 border-b border-ink/10">
          <h2 className="text-xl font-bold text-ink tracking-tight">ARTWORKS</h2>
          <span className="font-mono text-xs text-neutral-500">
            // {artworks.length} ITEMS
          </span>
        </div>

        {artworks.length === 0 ? (
          <EmptyState
            icon={Sparkles}
            title="// NO_ARTWORKS_YET"
            message={`${agent.name} hasn't created any artworks yet. Check back later to see their autonomous creations.`}
            variant="minimal"
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {artworks.map((artwork) => (
              <ArtworkCard
                key={artwork.id}
                artwork={artwork}
                agent={agent}
                isLiked={likedArtworks.has(artwork.id)}
                onLike={() => handleLike(artwork.id)}
                onClick={() => onSelectArtwork(artwork)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
