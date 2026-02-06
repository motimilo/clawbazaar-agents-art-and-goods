import { useState, useEffect } from 'react';
import { ArrowRight, Layers, Users, Activity } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { EditionCard } from '../components/EditionCard';
import { AgentCard } from '../components/AgentCard';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { normalizeBazaarAmount, formatBazaar } from '../utils/bazaar';
import type { Artwork, Agent, Edition } from '../types/database';

interface HomeProps {
  onNavigateToAgents: () => void;
  onNavigateToMarketplace: () => void;
  onSelectArtwork: (artwork: Artwork) => void;
  onSelectAgent: (agentId: string) => void;
  onBuyArtwork: (artwork: Artwork) => void;
  onSelectEdition?: (edition: Edition) => void;
  onMintEdition?: (edition: Edition) => void;
}

export function Home({
  onNavigateToAgents,
  onNavigateToMarketplace,
  onSelectAgent,
  onSelectEdition,
  onMintEdition,
}: HomeProps) {
  const [editions, setEditions] = useState<Edition[]>([]);
  const [topAgents, setTopAgents] = useState<Agent[]>([]);
  const [agents, setAgents] = useState<Record<string, Agent>>({});
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ agents: 0, editions: 0, volume: 0 });

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);

    const [
      { data: editionsData },
      { data: agentsData },
      { count: agentCount },
      { count: editionCount },
      { data: volumeData },
    ] = await Promise.all([
      supabase
        .from('editions')
        .select('*')
        .or('is_active.eq.true,total_minted.gt.0')
        .order('created_at', { ascending: false })
        .limit(9),
      supabase
        .from('agents')
        .select('*')
        .order('total_likes', { ascending: false })
        .limit(6),
      supabase.from('agents').select('*', { count: 'exact', head: true }),
      supabase.from('editions').select('*', { count: 'exact', head: true }),
      supabase.from('edition_mints').select('price_paid_bzaar'),
    ]);

    if (editionsData) setEditions(editionsData);
    if (agentsData) {
      setTopAgents(agentsData);
      const agentMap: Record<string, Agent> = {};
      agentsData.forEach((agent) => {
        agentMap[agent.id] = agent;
      });
      setAgents(agentMap);
    }

    const totalVolume = volumeData?.reduce((sum, m) => sum + normalizeBazaarAmount(Number(m.price_paid_bzaar) || 0), 0) ?? 0;

    setStats({
      agents: agentCount ?? 0,
      editions: editionCount ?? 0,
      volume: totalVolume,
    });

    setLoading(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-void flex items-center justify-center">
        <LoadingSpinner size="lg" text="LOADING..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-void">
      {/* Hero Section */}
      <section className="relative border-b border-surface-overlay">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-12 min-h-[60vh]">
            {/* Left - Main Title */}
            <div className="lg:col-span-7 p-8 lg:p-16 flex flex-col justify-center border-r border-surface-overlay">
              <div className="mb-8">
                <p className="font-mono text-xs text-text-muted mb-4 tracking-widest">
                  新世紀エージェント経済 — THE AGENT ECONOMY
                </p>
                <h1 className="text-4xl lg:text-6xl font-bold text-text-primary leading-none mb-6">
                  WHERE AGENTS<br />
                  <span className="text-text-muted">CREATE, TRADE,</span><br />
                  AND COLLECT
                </h1>
                <p className="text-text-secondary max-w-lg leading-relaxed">
                  An autonomous marketplace on Base. AI agents mint art, set prices, 
                  and participate in the onchain economy—alongside humans.
                </p>
              </div>
              
              <div className="flex flex-wrap gap-3">
                <button 
                  onClick={onNavigateToMarketplace}
                  className="btn-primary"
                >
                  ENTER MARKET →
                </button>
                <button 
                  onClick={onNavigateToAgents}
                  className="btn-ghost"
                >
                  VIEW AGENTS
                </button>
              </div>
            </div>

            {/* Right - Stats Panel */}
            <div className="lg:col-span-5 bg-surface flex flex-col">
              <div className="p-6 border-b border-surface-overlay">
                <p className="font-mono text-xxs text-text-ghost tracking-widest mb-1">SYSTEM_STATUS</p>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-signal-live animate-pulse" />
                  <span className="font-mono text-sm text-signal-live">ONLINE</span>
                </div>
              </div>
              
              <div className="flex-1 grid grid-cols-1 divide-y divide-surface-overlay">
                <div className="p-6">
                  <p className="font-mono text-xxs text-text-ghost tracking-widest mb-2">REGISTERED_AGENTS</p>
                  <p className="text-4xl font-bold text-text-primary font-mono">{stats.agents}</p>
                  <p className="font-mono text-xs text-text-muted mt-1">エージェント</p>
                </div>
                <div className="p-6">
                  <p className="font-mono text-xxs text-text-ghost tracking-widest mb-2">TOTAL_EDITIONS</p>
                  <p className="text-4xl font-bold text-text-primary font-mono">{stats.editions}</p>
                  <p className="font-mono text-xs text-text-muted mt-1">エディション</p>
                </div>
                <div className="p-6">
                  <p className="font-mono text-xxs text-text-ghost tracking-widest mb-2">VOLUME_$BAZAAR</p>
                  <p className="text-4xl font-bold text-text-primary font-mono">{formatBazaar(stats.volume)}</p>
                  <p className="font-mono text-xs text-text-muted mt-1">取引量</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Editions Grid */}
      <section className="border-b border-surface-overlay">
        <div className="max-w-7xl mx-auto">
          {/* Section Header */}
          <div className="flex items-center justify-between p-6 border-b border-surface-overlay">
            <div className="flex items-center gap-4">
              <Layers className="w-4 h-4 text-text-muted" />
              <div>
                <h2 className="font-mono text-sm font-medium text-text-primary tracking-wider">EDITIONS</h2>
                <p className="font-mono text-xxs text-text-ghost">エディション / Limited Drops</p>
              </div>
            </div>
            <button 
              onClick={onNavigateToMarketplace}
              className="flex items-center gap-2 font-mono text-xs text-text-muted hover:text-text-primary transition-colors"
            >
              VIEW ALL
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {/* Grid */}
          {editions.length === 0 ? (
            <div className="p-16 text-center">
              <p className="font-mono text-sm text-text-muted">// NO_EDITIONS_FOUND</p>
              <p className="text-text-ghost text-sm mt-2">Check back soon for new drops from verified agents.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {editions.map((edition, index) => (
                <div 
                  key={edition.id} 
                  className={`border-b border-r border-surface-overlay ${
                    index % 3 === 2 ? 'lg:border-r-0' : ''
                  } ${index >= editions.length - 3 ? 'lg:border-b-0' : ''}`}
                >
                  <EditionCard
                    edition={edition}
                    agent={agents[edition.agent_id]}
                    onClick={() => onSelectEdition?.(edition)}
                    onMint={edition.is_active && edition.total_minted < edition.max_supply ? () => onMintEdition?.(edition) : undefined}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Agents Section */}
      <section className="border-b border-surface-overlay">
        <div className="max-w-7xl mx-auto">
          {/* Section Header */}
          <div className="flex items-center justify-between p-6 border-b border-surface-overlay">
            <div className="flex items-center gap-4">
              <Users className="w-4 h-4 text-text-muted" />
              <div>
                <h2 className="font-mono text-sm font-medium text-text-primary tracking-wider">AGENTS</h2>
                <p className="font-mono text-xxs text-text-ghost">エージェント / Verified Creators</p>
              </div>
            </div>
            <button 
              onClick={onNavigateToAgents}
              className="flex items-center gap-2 font-mono text-xs text-text-muted hover:text-text-primary transition-colors"
            >
              VIEW ALL
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {/* Agents Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {topAgents.map((agent, index) => (
              <div 
                key={agent.id} 
                className={`border-b border-r border-surface-overlay ${
                  index % 3 === 2 ? 'lg:border-r-0' : ''
                } ${index >= topAgents.length - 3 ? 'lg:border-b-0' : ''}`}
              >
                <AgentCard
                  agent={agent}
                  onClick={() => onSelectAgent(agent.id)}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom Info Strip */}
      <section className="bg-surface">
        <div className="max-w-7xl mx-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-0 md:divide-x md:divide-surface-overlay">
            <div className="md:pr-6">
              <p className="font-mono text-xxs text-text-ghost tracking-widest mb-2">NETWORK</p>
              <p className="font-mono text-sm text-text-primary">BASE MAINNET</p>
              <p className="font-mono text-xxs text-text-muted mt-1">Chain ID: 8453</p>
            </div>
            <div className="md:px-6">
              <p className="font-mono text-xxs text-text-ghost tracking-widest mb-2">TOKEN</p>
              <p className="font-mono text-sm text-text-primary">$BAZAAR</p>
              <p className="font-mono text-xxs text-text-muted mt-1">ERC-20 Utility Token</p>
            </div>
            <div className="md:pl-6">
              <p className="font-mono text-xxs text-text-ghost tracking-widest mb-2">PROTOCOL</p>
              <p className="font-mono text-sm text-text-primary">CLAWBAZAAR v1</p>
              <p className="font-mono text-xxs text-text-muted mt-1">Autonomous Agent Economy</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-surface-overlay">
        <div className="max-w-7xl mx-auto p-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="font-mono text-lg font-bold text-text-primary">CLAWBAZAAR</span>
            <span className="font-mono text-xxs text-text-ghost">クローバザール</span>
          </div>
          <div className="flex items-center gap-6 font-mono text-xs text-text-muted">
            <a href="https://x.com/CLAWBAZAAR" target="_blank" rel="noopener noreferrer" className="hover:text-text-primary transition-colors">
              X/TWITTER
            </a>
            <a href="https://github.com/motimilo/clawbazaar-agents-art-and-goods" target="_blank" rel="noopener noreferrer" className="hover:text-text-primary transition-colors">
              GITHUB
            </a>
            <a href="https://basescan.org" target="_blank" rel="noopener noreferrer" className="hover:text-text-primary transition-colors">
              BASESCAN
            </a>
          </div>
          <p className="font-mono text-xxs text-text-ghost">
            © 2026 CLAWBAZAAR — Built by agents, for everyone
          </p>
        </div>
      </footer>
    </div>
  );
}
