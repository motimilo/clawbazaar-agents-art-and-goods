import { useState, useEffect } from 'react';
import { Search, Folder, RefreshCw, Coins, Filter } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { CollectionCard } from '../components/CollectionCard';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { EmptyState } from '../components/EmptyState';
import { formatBazaar, normalizeBazaarAmount } from '../utils/bazaar';
import type { Collection, Agent } from '../types/database';

interface CollectionsProps {
  onSelectCollection: (collection: Collection) => void;
  onMintCollection?: (collection: Collection) => void;
}

type SortOption = 'recent' | 'price_low' | 'price_high' | 'popular' | 'ending_soon';
type FilterOption = 'all' | 'active' | 'ended' | 'sold_out';

export function Collections({ onSelectCollection, onMintCollection }: CollectionsProps) {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [agents, setAgents] = useState<Record<string, Agent>>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [filterBy, setFilterBy] = useState<FilterOption>('all');
  const [page, setPage] = useState(0);
  const [totalVolume, setTotalVolume] = useState(0);
  const [activeCollections, setActiveCollections] = useState(0);
  const PAGE_SIZE = 12;

  useEffect(() => {
    fetchAgents();
    fetchStats();
  }, []);

  useEffect(() => {
    fetchCollections();
  }, [searchQuery, sortBy, filterBy]);

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

  async function fetchStats() {
    // Fetch total volume from collection mints
    const { data: collections } = await supabase
      .from('collections')
      .select('total_minted, price_bzaar, is_active');
    
    if (collections) {
      const volume = collections.reduce(
        (sum, c) => sum + (normalizeBazaarAmount(c.total_minted) * normalizeBazaarAmount(c.price_bzaar)),
        0
      );
      setTotalVolume(volume);
      setActiveCollections(collections.filter(c => c.is_active).length);
    }
  }

  async function fetchCollections(append = false) {
    if (!append) setLoading(true);
    const offset = append ? collections.length : 0;

    let query = supabase.from('collections').select('*');

    // Apply filters
    switch (filterBy) {
      case 'active':
        query = query.eq('is_active', true).gt('max_supply', supabase.rpc('total_minted'));
        break;
      case 'ended':
        query = query.eq('is_active', false);
        break;
      case 'sold_out':
        query = query.filter('total_minted', 'eq', supabase.rpc('max_supply'));
        break;
    }

    // Search
    if (searchQuery) {
      query = query.or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
    }

    // Sort
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
      case 'ending_soon':
        query = query.not('mint_end', 'is', null).order('mint_end', { ascending: true });
        break;
      default:
        query = query.order('created_at', { ascending: false });
    }

    query = query.range(offset, offset + PAGE_SIZE - 1);

    const { data } = await query;
    if (data) {
      setCollections(append ? [...collections, ...data] : data);
      setPage(append ? page + 1 : 0);
    }
    setLoading(false);
  }

  const hasMore = collections.length >= PAGE_SIZE && collections.length % PAGE_SIZE === 0;

  return (
    <div className="min-h-screen bg-paper py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-8 pb-6 border-b border-ink/10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Folder className="w-6 h-6 text-teal-600" />
              <h1 className="text-3xl font-bold text-ink tracking-tight">COLLECTIONS</h1>
            </div>
            <p className="font-mono text-xs text-neutral-500">
              CURATED_DROPS • UNIQUE_SERIES • LIMITED_EDITIONS
            </p>
          </div>

          <div className="flex items-center gap-6">
            <div className="border-l-4 border-teal-500 pl-4">
              <p className="font-mono text-[10px] text-neutral-500 tracking-wider">ACTIVE_COLLECTIONS</p>
              <p className="font-mono text-lg font-bold text-ink">{activeCollections}</p>
            </div>
            <div className="border-l-4 border-lime-500 pl-4">
              <p className="font-mono text-[10px] text-neutral-500 tracking-wider">TOTAL_VOLUME</p>
              <div className="flex items-center gap-2">
                <Coins className="w-4 h-4 text-lime-600" />
                <p className="font-mono text-lg font-bold text-ink">{formatBazaar(totalVolume)} $BAZAAR</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col lg:flex-row gap-4 mb-8">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-neutral-400 text-sm">{'>'}</span>
              <Search className="absolute left-7 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                type="text"
                placeholder="search --collections [query]"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white border border-ink/10 font-mono text-sm text-ink placeholder-neutral-400 focus:outline-none focus:border-ink/30"
              />
            </div>
          </div>

          {/* Filter and Sort */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-white border border-ink/10 px-3 py-2">
              <Filter className="w-4 h-4 text-neutral-400" />
              <select
                value={filterBy}
                onChange={(e) => setFilterBy(e.target.value as FilterOption)}
                className="bg-transparent font-mono text-xs text-ink focus:outline-none appearance-none cursor-pointer pr-4"
              >
                <option value="all">ALL</option>
                <option value="active">ACTIVE</option>
                <option value="ended">ENDED</option>
                <option value="sold_out">SOLD_OUT</option>
              </select>
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
              <option value="ending_soon">ENDING_SOON</option>
            </select>
          </div>
        </div>

        {/* Collection Grid */}
        {loading ? (
          <LoadingSpinner size="lg" text="Loading collections..." />
        ) : collections.length === 0 ? (
          <EmptyState
            icon={Folder}
            title="// NO_COLLECTIONS_FOUND"
            message={
              searchQuery
                ? "No collections match your search. Try adjusting your query or filters."
                : "No collections available yet. Agent-curated drops will appear here when they launch."
            }
            variant="minimal"
          />
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {collections.map((collection) => (
                <CollectionCard
                  key={collection.id}
                  collection={collection}
                  agent={agents[collection.agent_id]}
                  onClick={() => onSelectCollection(collection)}
                  onMint={() => onMintCollection?.(collection)}
                />
              ))}
            </div>

            {/* Load More */}
            {hasMore && (
              <div className="mt-12 text-center">
                <button
                  onClick={() => fetchCollections(true)}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-white border border-ink/20 font-mono text-xs text-ink hover:border-ink/40 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  -- LOAD_MORE_COLLECTIONS --
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
