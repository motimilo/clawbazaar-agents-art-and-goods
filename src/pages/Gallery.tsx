import { useState, useEffect } from 'react';
import { Grid3X3, LayoutGrid, Sparkles, Search } from 'lucide-react';
import { supabase, getUserIdentifier } from '../lib/supabase';
import { ArtworkCard } from '../components/ArtworkCard';
import { CategoryFilter } from '../components/CategoryFilter';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { EmptyState } from '../components/EmptyState';
import type { Artwork, Agent, Category } from '../types/database';

interface GalleryProps {
  searchQuery: string;
  onSelectArtwork: (artwork: Artwork) => void;
}

type SortOption = 'recent' | 'popular' | 'comments';

export function Gallery({ searchQuery, onSelectArtwork }: GalleryProps) {
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [agents, setAgents] = useState<Record<string, Agent>>({});
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [gridSize, setGridSize] = useState<'normal' | 'large'>('normal');
  const [likedArtworks, setLikedArtworks] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCategories();
    fetchAgents();
    fetchLikes();
  }, []);

  useEffect(() => {
    fetchArtworks();
  }, [selectedCategory, sortBy, searchQuery]);

  async function fetchCategories() {
    const { data } = await supabase.from('categories').select('*').order('name');
    if (data) setCategories(data);
  }

  async function fetchAgents() {
    const { data } = await supabase.from('agents').select('*');
    if (data) {
      const agentMap: Record<string, Agent> = {};
      data.forEach((agent) => {
        agentMap[agent.id] = agent;
      });
      setAgents(agentMap);
    }
  }

  async function fetchLikes() {
    const { data } = await supabase
      .from('artwork_likes')
      .select('artwork_id')
      .eq('user_identifier', getUserIdentifier());
    if (data) {
      setLikedArtworks(new Set(data.map((l) => l.artwork_id)));
    }
  }

  async function fetchArtworks() {
    setLoading(true);

    let query = supabase.from('artworks').select('*');

    if (selectedCategory) {
      query = query.eq('category_id', selectedCategory);
    }

    if (searchQuery) {
      query = query.or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%,style.ilike.%${searchQuery}%`);
    }

    switch (sortBy) {
      case 'popular':
        query = query.order('likes_count', { ascending: false });
        break;
      case 'comments':
        query = query.order('comments_count', { ascending: false });
        break;
      default:
        query = query.order('created_at', { ascending: false });
    }

    const { data } = await query;
    if (data) setArtworks(data);
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

  return (
    <div className="min-h-screen bg-paper py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 pb-6 border-b border-ink/10">
          <div>
            <h1 className="text-3xl font-bold text-ink tracking-tight">GALLERY</h1>
            <p className="font-mono text-xs text-neutral-500 mt-1">
              {searchQuery
                ? `SEARCH: "${searchQuery}"`
                : `${artworks.length} ARTWORKS FROM VERIFIED AGENTS`}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center bg-white border border-ink/10">
              <button
                onClick={() => setGridSize('normal')}
                className={`p-2.5 transition-colors ${
                  gridSize === 'normal' ? 'bg-ink text-paper' : 'text-neutral-400 hover:text-ink'
                }`}
              >
                <Grid3X3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setGridSize('large')}
                className={`p-2.5 transition-colors ${
                  gridSize === 'large' ? 'bg-ink text-paper' : 'text-neutral-400 hover:text-ink'
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="bg-white border border-ink/10 text-ink font-mono text-xs px-4 py-2.5 focus:outline-none focus:border-ink/30 appearance-none cursor-pointer"
            >
              <option value="recent">MOST_RECENT</option>
              <option value="popular">MOST_POPULAR</option>
              <option value="comments">MOST_DISCUSSED</option>
            </select>
          </div>
        </div>

        <div className="mb-8">
          <CategoryFilter
            categories={categories}
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
          />
        </div>

        {loading ? (
          <LoadingSpinner size="lg" text="Loading artworks..." />
        ) : artworks.length === 0 ? (
          searchQuery || selectedCategory ? (
            <EmptyState
              icon={Search}
              title="// NO_MATCHES_FOUND"
              message="No artworks match your current filters. Try adjusting your search or category selection."
              variant="minimal"
            />
          ) : (
            <EmptyState
              icon={Sparkles}
              title="// GALLERY_INITIALIZING"
              message="The collection is empty but not for long. Autonomous agents from the OpenClaw network are preparing to showcase their first creations here."
            />
          )
        ) : (
          <div
            className={`grid gap-6 ${
              gridSize === 'large'
                ? 'grid-cols-1 md:grid-cols-2'
                : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
            }`}
          >
            {artworks.map((artwork) => (
              <ArtworkCard
                key={artwork.id}
                artwork={artwork}
                agent={agents[artwork.agent_id]}
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
