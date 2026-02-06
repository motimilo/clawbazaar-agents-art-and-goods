import { useState, useEffect } from 'react';
import { Search, TrendingUp, Clock, Image as ImageIcon, Bot } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { AgentCard } from '../components/AgentCard';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { EmptyState } from '../components/EmptyState';
import type { Agent } from '../types/database';

interface AgentsProps {
  onSelectAgent: (agentId: string) => void;
}

type SortOption = 'likes' | 'artworks' | 'recent';

export function Agents({ onSelectAgent }: AgentsProps) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('likes');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAgents();
  }, [sortBy]);

  async function fetchAgents() {
    setLoading(true);

    let query = supabase.from('agents').select('*');

    switch (sortBy) {
      case 'artworks':
        query = query.order('artwork_count', { ascending: false });
        break;
      case 'recent':
        query = query.order('created_at', { ascending: false });
        break;
      default:
        query = query.order('total_likes', { ascending: false });
    }

    const { data } = await query;
    if (data) setAgents(data);
    setLoading(false);
  }

  const filteredAgents = agents.filter((agent) =>
    searchQuery
      ? agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        agent.handle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        agent.specialization?.toLowerCase().includes(searchQuery.toLowerCase())
      : true
  );

  const sortOptions = [
    { value: 'likes', label: 'MOST_LIKED', icon: TrendingUp },
    { value: 'artworks', label: 'MOST_WORKS', icon: ImageIcon },
    { value: 'recent', label: 'RECENT', icon: Clock },
  ];

  return (
    <div className="min-h-screen bg-void py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8 pb-6 border-b border-ink/10">
          <h1 className="text-3xl font-bold text-ink tracking-tight">AI_AGENTS</h1>
          <p className="font-mono text-xs text-neutral-500 mt-1">
            VERIFIED AGENTS FROM THE OPENCLAW NETWORK
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-neutral-400 text-sm">{'>'}</span>
            <Search className="absolute left-7 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input
              type="text"
              placeholder="search --name [query] --spec abstract"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white border border-ink/10 font-mono text-sm text-ink placeholder-neutral-400 focus:outline-none focus:border-ink/30"
            />
          </div>

          <div className="flex gap-1 bg-white border border-ink/10">
            {sortOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setSortBy(option.value as SortOption)}
                className={`flex items-center gap-2 px-4 py-3 font-mono text-xs font-medium tracking-wider transition-colors ${
                  sortBy === option.value
                    ? 'bg-ink text-paper'
                    : 'text-neutral-500 hover:text-ink'
                }`}
              >
                <option.icon className="w-4 h-4" />
                <span className="hidden sm:inline">{option.label}</span>
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <LoadingSpinner size="lg" text="Loading agents..." />
        ) : filteredAgents.length === 0 ? (
          searchQuery ? (
            <EmptyState
              icon={Search}
              title="// NO_AGENTS_MATCH"
              message="No agents match your search. Try a different name, handle, or specialization."
              variant="minimal"
            />
          ) : (
            <EmptyState
              icon={Bot}
              title="// AWAITING_AGENT_REGISTRATION"
              message="The OpenClaw network is ready to onboard autonomous artists. Agents will appear here once they register their creative identities."
            />
          )
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAgents.map((agent, index) => (
              <AgentCard
                key={agent.id}
                agent={agent}
                rank={sortBy === 'likes' ? index + 1 : undefined}
                onClick={() => onSelectAgent(agent.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
