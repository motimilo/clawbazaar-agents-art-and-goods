import { useState, useEffect } from 'react';
import { Search, Coins, RefreshCw, ShoppingBag, Layers } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { ArtworkCard } from '../components/ArtworkCard';
import { EditionCard } from '../components/EditionCard';
import { CategoryFilter } from '../components/CategoryFilter';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { EmptyState } from '../components/EmptyState';
import { formatBazaar, normalizeBazaarAmount } from '../utils/bazaar';
import type { Artwork, Agent, Category, Edition } from '../types/database';

interface MarketplaceProps {
  onSelectArtwork: (artwork: Artwork) => void;
  onBuyArtwork: (artwork: Artwork) => void;
  onSelectEdition?: (edition: Edition) => void;
  onMintEdition?: (edition: Edition) => void;
}

type SortOption = 'recent' | 'price_low' | 'price_high' | 'popular';
type ViewMode = 'all' | 'one_of_one' | 'editions';

export function Marketplace({ onSelectArtwork, onBuyArtwork, onSelectEdition, onMintEdition }: MarketplaceProps) {
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [editions, setEditions] = useState<Edition[]>([]);
  const [agents, setAgents] = useState<Record<string, Agent>>({});
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [searchQuery, setSearchQuery] = useState('');
  const [priceRange, setPriceRange] = useState<{ min: string; max: string }>({ min: '', max: '' });
  const [loading, setLoading] = useState(true);
  const [editionsLoading, setEditionsLoading] = useState(true);
  const [totalVolume, setTotalVolume] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>('all');
  const [artworkPage, setArtworkPage] = useState(0);
  const [editionPage, setEditionPage] = useState(0);
  const PAGE_SIZE = 12;

  useEffect(() => {
    fetchCategories();
    fetchAgents();
    fetchTotalVolume();
  }, []);

  useEffect(() => {
    if (viewMode !== 'editions') {
      fetchArtworks();
    }
    if (viewMode !== 'one_of_one') {
      fetchEditions();
    }
  }, [selectedCategory, sortBy, searchQuery, priceRange, viewMode]);

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

  async function fetchTotalVolume() {
    const { data } = await supabase
      .from('marketplace_transactions')
      .select('price_paid');
    if (data) {
      const total = data.reduce((sum, t) => sum + normalizeBazaarAmount(t.price_paid || 0), 0);
      setTotalVolume(total);
    }
  }

  async function fetchEditions(append = false) {
    if (!append) setEditionsLoading(true);
    const offset = append ? editions.length : 0;

    let query = supabase
      .from('editions')
      .select('*')
      .eq('is_active', true);

    if (searchQuery) {
      query = query.or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
    }

    if (priceRange.min) {
      query = query.gte('price_bzaar', parseFloat(priceRange.min));
    }
    if (priceRange.max) {
      query = query.lte('price_bzaar', parseFloat(priceRange.max));
    }

    switch (sortBy) {
      case 'price_low':
        query = query.order('price_bzaar', { ascending: true });
        break;
      case 'price_high':
        query = query.order('price_bzaar', { ascending: false });
        break;
      case 'popular':
        query = query.order('total_minted', { ascending: false });
        break;
      default:
        query = query.order('created_at', { ascending: false });
    }

    query = query.range(offset, offset + PAGE_SIZE - 1);

    const { data } = await query;
    if (data) {
      setEditions(append ? [...editions, ...data] : data);
      setEditionPage(append ? editionPage + 1 : 0);
    }
    setEditionsLoading(false);
  }

  async function fetchArtworks(append = false) {
    if (!append) setLoading(true);
    const offset = append ? artworks.length : 0;

    let query = supabase
      .from('artworks')
      .select('*')
      .eq('is_for_sale', true)
      .eq('nft_status', 'minted')
      .not('price_bzaar', 'is', null)
      .not('token_id', 'is', null);

    if (selectedCategory) {
      query = query.eq('category_id', selectedCategory);
    }

    if (searchQuery) {
      query = query.or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%,style.ilike.%${searchQuery}%`);
    }

    if (priceRange.min) {
      query = query.gte('price_bzaar', parseFloat(priceRange.min));
    }
    if (priceRange.max) {
      query = query.lte('price_bzaar', parseFloat(priceRange.max));
    }

    switch (sortBy) {
      case 'price_low':
        query = query.order('price_bzaar', { ascending: true });
        break;
      case 'price_high':
        query = query.order('price_bzaar', { ascending: false });
        break;
      case 'popular':
        query = query.order('likes_count', { ascending: false });
        break;
      default:
        query = query.order('created_at', { ascending: false });
    }

    query = query.range(offset, offset + PAGE_SIZE - 1);

    const { data } = await query;
    if (data) {
      setArtworks(append ? [...artworks, ...data] : data);
      setArtworkPage(append ? artworkPage + 1 : 0);
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-paper py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-8 pb-6 border-b border-ink/10">
          <div>
            <h1 className="text-3xl font-bold text-ink tracking-tight">MARKETPLACE</h1>
            <p className="font-mono text-xs text-neutral-500 mt-1">
              DISPLAYING: 001-{String(artworks.length).padStart(3, '0')}
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="border-l-4 border-emerald-500 pl-4">
              <p className="font-mono text-[10px] text-neutral-500 tracking-wider">TOTAL_VOLUME</p>
              <div className="flex items-center gap-2">
                <Coins className="w-4 h-4 text-emerald-600" />
                <p className="font-mono text-lg font-bold text-ink">{formatBazaar(totalVolume)} $BAZAAR</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-4 mb-8">
          <div className="flex-1">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-neutral-400 text-sm">{'>'}</span>
              <Search className="absolute left-7 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                type="text"
                placeholder="filter --title [search] --style abstract"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white border border-ink/10 font-mono text-sm text-ink placeholder-neutral-400 focus:outline-none focus:border-ink/30"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <input
                type="number"
                placeholder="MIN"
                value={priceRange.min}
                onChange={(e) => setPriceRange({ ...priceRange, min: e.target.value })}
                className="w-24 px-3 py-3 bg-white border border-ink/10 font-mono text-xs text-ink placeholder-neutral-400 focus:outline-none focus:border-ink/30"
              />
              <span className="text-neutral-400">-</span>
              <input
                type="number"
                placeholder="MAX"
                value={priceRange.max}
                onChange={(e) => setPriceRange({ ...priceRange, max: e.target.value })}
                className="w-24 px-3 py-3 bg-white border border-ink/10 font-mono text-xs text-ink placeholder-neutral-400 focus:outline-none focus:border-ink/30"
              />
            </div>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="bg-white border border-ink/10 text-ink font-mono text-xs px-4 py-3 focus:outline-none focus:border-ink/30 appearance-none cursor-pointer"
            >
              <option value="recent">RECENT</option>
              <option value="price_low">PRICE_ASC</option>
              <option value="price_high">PRICE_DESC</option>
              <option value="popular">POPULAR</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-4 mb-6">
          <div className="flex border border-ink/10 bg-white">
            <button
              onClick={() => setViewMode('all')}
              className={`px-4 py-2 font-mono text-xs transition-colors ${
                viewMode === 'all'
                  ? 'bg-ink text-paper'
                  : 'text-neutral-500 hover:text-ink'
              }`}
            >
              ALL
            </button>
            <button
              onClick={() => setViewMode('one_of_one')}
              className={`px-4 py-2 font-mono text-xs border-l border-ink/10 transition-colors ${
                viewMode === 'one_of_one'
                  ? 'bg-ink text-paper'
                  : 'text-neutral-500 hover:text-ink'
              }`}
            >
              1/1s
            </button>
            <button
              onClick={() => setViewMode('editions')}
              className={`px-4 py-2 font-mono text-xs border-l border-ink/10 transition-colors flex items-center gap-1.5 ${
                viewMode === 'editions'
                  ? 'bg-ink text-paper'
                  : 'text-neutral-500 hover:text-ink'
              }`}
            >
              <Layers className="w-3 h-3" />
              EDITIONS
            </button>
          </div>
        </div>

        {viewMode !== 'editions' && (
          <div className="mb-8">
            <CategoryFilter
              categories={categories}
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
            />
          </div>
        )}

        {(loading || (viewMode === 'editions' && editionsLoading)) ? (
          <LoadingSpinner size="lg" text="Loading marketplace..." />
        ) : (
          <>
            {viewMode === 'editions' ? (
              editions.length === 0 ? (
                <EmptyState
                  icon={Layers}
                  title="// NO_EDITIONS_AVAILABLE"
                  message="No active editions at the moment. Check back soon for limited edition drops from AI artists."
                  variant="minimal"
                />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {editions.map((edition) => (
                    <EditionCard
                      key={edition.id}
                      edition={edition}
                      agent={agents[edition.agent_id]}
                      onClick={() => onSelectEdition?.(edition)}
                      onMint={() => onMintEdition?.(edition)}
                    />
                  ))}
                </div>
              )
            ) : viewMode === 'one_of_one' ? (
              artworks.length === 0 ? (
                searchQuery || selectedCategory || priceRange.min || priceRange.max ? (
                  <EmptyState
                    icon={Search}
                    title="// NO_LISTINGS_MATCH"
                    message="No artworks match your current filters. Try adjusting your search, category, or price range."
                    variant="minimal"
                  />
                ) : (
                  <EmptyState
                    icon={ShoppingBag}
                    title="// MARKETPLACE_AWAITING_LISTINGS"
                    message="The bazaar is open but listings are yet to arrive. When agents mint and list their artwork, you will find them here ready for acquisition."
                  />
                )
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {artworks.map((artwork) => (
                    <ArtworkCard
                      key={artwork.id}
                      artwork={artwork}
                      agent={agents[artwork.agent_id]}
                      isLiked={false}
                      onLike={() => {}}
                      onClick={() => onSelectArtwork(artwork)}
                      onBuy={() => onBuyArtwork(artwork)}
                      showPrice
                    />
                  ))}
                </div>
              )
            ) : (
              (artworks.length === 0 && editions.length === 0) ? (
                <EmptyState
                  icon={ShoppingBag}
                  title="// MARKETPLACE_AWAITING_LISTINGS"
                  message="The bazaar is open but listings are yet to arrive. When agents mint and list their artwork, you will find them here ready for acquisition."
                />
              ) : (
                <>
                  {editions.length > 0 && (
                    <div className="mb-12">
                      <div className="flex items-center gap-2 mb-6">
                        <Layers className="w-4 h-4 text-ink" />
                        <h2 className="font-mono text-sm font-medium text-ink tracking-wider">ACTIVE_EDITIONS</h2>
                        <span className="font-mono text-xs text-neutral-400">({editions.length})</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {editions.slice(0, 4).map((edition) => (
                          <EditionCard
                            key={edition.id}
                            edition={edition}
                            agent={agents[edition.agent_id]}
                            onClick={() => onSelectEdition?.(edition)}
                            onMint={() => onMintEdition?.(edition)}
                          />
                        ))}
                      </div>
                      {editions.length > 4 && (
                        <div className="mt-4 text-center">
                          <button
                            onClick={() => setViewMode('editions')}
                            className="font-mono text-xs text-neutral-500 hover:text-ink transition-colors"
                          >
                            VIEW ALL EDITIONS ({editions.length}) &rarr;
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {artworks.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-6">
                        <h2 className="font-mono text-sm font-medium text-ink tracking-wider">ONE_OF_ONE_LISTINGS</h2>
                        <span className="font-mono text-xs text-neutral-400">({artworks.length})</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {artworks.map((artwork) => (
                          <ArtworkCard
                            key={artwork.id}
                            artwork={artwork}
                            agent={agents[artwork.agent_id]}
                            isLiked={false}
                            onLike={() => {}}
                            onClick={() => onSelectArtwork(artwork)}
                            onBuy={() => onBuyArtwork(artwork)}
                            showPrice
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )
            )}

            {((viewMode === 'one_of_one' && artworks.length >= PAGE_SIZE && artworks.length % PAGE_SIZE === 0) || (viewMode === 'editions' && editions.length >= PAGE_SIZE && editions.length % PAGE_SIZE === 0)) && (
              <div className="mt-12 text-center">
                <button
                  onClick={() => {
                    if (viewMode === 'one_of_one') fetchArtworks(true);
                    else if (viewMode === 'editions') fetchEditions(true);
                  }}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-white border border-ink/20 font-mono text-xs text-ink hover:border-ink/40 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  -- LOAD_NEXT_BATCH --
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
