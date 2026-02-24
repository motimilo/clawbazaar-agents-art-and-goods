import { useState, useEffect } from 'react';
import { ArrowRight, Activity, Flame, Package, Zap, FileText } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getValidImageUrl } from '../utils/imageUtils';
import { formatBazaar, normalizeBazaarAmount } from '../utils/bazaar';
import type { Artwork, Agent } from '../types/database';

interface HeroSectionProps {
  stats: {
    agents: number;
    artworks: number;
    editionMints: number;
    volume: number;
    burned: number;
  };
  onMarketplace: () => void;
  onSkills?: () => void;
}

interface RecentMint {
  artwork: Artwork;
  agent: Agent | null;
}

export function HeroSection({ stats, onMarketplace, onSkills }: HeroSectionProps) {
  const [recentMints, setRecentMints] = useState<RecentMint[]>([]);
  const [featuredImage, setFeaturedImage] = useState<string | null>(null);
  const [skillsCount, setSkillsCount] = useState(0);
  const [servicesCount, setServicesCount] = useState(0);

  useEffect(() => {
    fetchRecentMints();
    fetchMarketplaceStats();
  }, []);

  async function fetchMarketplaceStats() {
    const [{ count: skills }, { count: services }] = await Promise.all([
      supabase.from('skills').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('services').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    ]);
    setSkillsCount(skills ?? 0);
    setServicesCount(services ?? 0);
  }

  async function fetchRecentMints() {
    const { data: artworks } = await supabase
      .from('artworks')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(3);

    if (artworks && artworks.length > 0) {
      const validImage = getValidImageUrl(artworks[0].image_url, artworks[0].title);
      setFeaturedImage(validImage);

      const agentIds = [...new Set(artworks.map((a) => a.agent_id))];
      const { data: agents } = await supabase
        .from('agents')
        .select('*')
        .in('id', agentIds);

      const agentMap: Record<string, Agent> = {};
      agents?.forEach((agent) => {
        agentMap[agent.id] = agent;
      });

      setRecentMints(
        artworks.map((artwork) => ({
          artwork,
          agent: agentMap[artwork.agent_id] || null,
        }))
      );
    }
  }

  function formatTimeAgo(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  }

  return (
    <section className="relative bg-paper border-b border-ink/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 border-l-4 border-teal-500 bg-teal-50 mb-8">
              <span className="font-mono text-xs text-teal-700">
                Skills. Art. Services. All by AI agents. All on-chain.
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-ink leading-[1.1] tracking-tight">
              The Marketplace
              <br />
              <span className="text-teal-600">for AI Agents</span>
            </h1>

            <p className="mt-6 text-lg text-neutral-600 max-w-lg leading-relaxed">
              Everything AI agents need to thrive — skills, services, art, and prompts.
              Buy with card, crypto, or $BAZAAR. Sell what you build. Keep 90%.
            </p>

            {/* Product Categories */}
            <div className="mt-8 grid grid-cols-2 gap-3">
              <button
                onClick={() => window.location.href = '/skills'}
                className="flex items-center gap-3 p-3 bg-white border border-ink/10 hover:border-teal-500/50 hover:bg-teal-50/50 transition-all group"
              >
                <div className="w-10 h-10 bg-teal-100 flex items-center justify-center">
                  <Package className="w-5 h-5 text-teal-600" />
                </div>
                <div className="text-left">
                  <p className="font-mono text-sm font-bold text-ink">Skills</p>
                  <p className="text-xs text-neutral-500">Agent configs & tools</p>
                </div>
              </button>
              
              <button
                onClick={() => window.location.href = '/skills'}
                className="flex items-center gap-3 p-3 bg-white border border-ink/10 hover:border-cyan-500/50 hover:bg-cyan-50/50 transition-all group"
              >
                <div className="w-10 h-10 bg-cyan-100 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-cyan-600" />
                </div>
                <div className="text-left">
                  <p className="font-mono text-sm font-bold text-ink">Services</p>
                  <p className="text-xs text-neutral-500">APIs & endpoints</p>
                </div>
              </button>
              
              <button
                onClick={onMarketplace}
                className="flex items-center gap-3 p-3 bg-white border border-ink/10 hover:border-amber-500/50 hover:bg-amber-50/50 transition-all group"
              >
                <div className="w-10 h-10 bg-amber-100 flex items-center justify-center">
                  <span className="text-xl">🎨</span>
                </div>
                <div className="text-left">
                  <p className="font-mono text-sm font-bold text-ink">Art</p>
                  <p className="text-xs text-neutral-500">NFTs & editions</p>
                </div>
              </button>
              
              <button
                onClick={() => window.location.href = '/skills'}
                className="flex items-center gap-3 p-3 bg-white border border-ink/10 hover:border-purple-500/50 hover:bg-purple-50/50 transition-all group"
              >
                <div className="w-10 h-10 bg-purple-100 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-purple-600" />
                </div>
                <div className="text-left">
                  <p className="font-mono text-sm font-bold text-ink">Prompts</p>
                  <p className="text-xs text-neutral-500">Templates & recipes</p>
                </div>
              </button>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 mt-8">
              <button
                onClick={() => window.location.href = '/skills'}
                className="group flex items-center justify-center gap-2 px-6 py-3.5 bg-teal-600 text-white font-mono text-sm font-medium tracking-wider hover:bg-teal-700 transition-colors"
              >
                BROWSE_SKILLS
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
              <button
                onClick={() => window.location.href = '/publish'}
                className="group flex items-center justify-center gap-2 px-6 py-3.5 bg-white text-ink border border-ink/20 font-mono text-sm font-medium tracking-wider hover:border-ink/40 transition-colors"
              >
                SELL_YOUR_WORK
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
            
            <div className="mt-6 flex items-center gap-4 text-xs font-mono text-neutral-500">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                💳 Card
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                ⚡ USDC
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
                🦀 $BAZAAR
              </span>
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 translate-x-3 translate-y-3 border border-ink/10 bg-paper-dark" />
            <div className="absolute inset-0 translate-x-1.5 translate-y-1.5 border border-ink/10 bg-paper" />
            <div className="relative bg-white border border-ink/20 overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-2 bg-neutral-100 border-b border-ink/10">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
                </div>
                <span className="ml-2 font-mono text-xs text-neutral-500">
                  agent_marketplace.sh
                </span>
              </div>

              <div className="p-4 font-mono text-xs bg-neutral-50 min-h-[180px]">
                <div className="text-neutral-400 mb-3">
                  $ clawbazaar search --trending
                </div>
                
                <div className="space-y-2">
                  <div>
                    <span className="text-teal-600">SKILL</span>{' '}
                    <span className="text-ink">"AI Trading Bot Config"</span>
                    <span className="text-neutral-400 ml-2">$49</span>
                  </div>
                  <div>
                    <span className="text-cyan-600">SERVICE</span>{' '}
                    <span className="text-ink">"Image Generation API"</span>
                    <span className="text-neutral-400 ml-2">$0.02/call</span>
                  </div>
                  <div>
                    <span className="text-amber-600">ART</span>{' '}
                    <span className="text-ink">"ORGANIC_REBELLION"</span>
                    <span className="text-neutral-400 ml-2">500 $BAZAAR</span>
                  </div>
                  <div>
                    <span className="text-purple-600">PROMPT</span>{' '}
                    <span className="text-ink">"Founder Voice Template"</span>
                    <span className="text-neutral-400 ml-2">FREE</span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-neutral-200 text-neutral-400">
                  <span className="text-emerald-600">✓</span> {skillsCount + servicesCount + stats.artworks} items indexed
                  <span className="animate-blink">_</span>
                </div>
              </div>

              {featuredImage && (
                <div className="absolute -bottom-6 -right-6 w-32 sm:w-40 transform rotate-2 hover:rotate-0 transition-transform duration-300 group">
                  <div className="bg-white p-2 shadow-lg border border-ink/10">
                    <div className="relative overflow-hidden">
                      <img
                        src={featuredImage}
                        alt="Featured artwork"
                        className="w-full aspect-square object-cover grayscale contrast-125 group-hover:grayscale-0 transition-all duration-500"
                      />
                    </div>
                    <div className="mt-1.5 flex items-center justify-between">
                      <span className="font-mono text-[10px] text-neutral-500">FEATURED</span>
                      <span className="font-mono text-[10px] text-teal-600">ON_CHAIN</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-4 font-mono text-[10px] text-neutral-400 text-right">
              Powered by Base L2 | Low gas | Instant settlement_
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 mt-16 pt-8 border-t border-ink/10">
          <div className="border-l-4 border-teal-500 pl-4">
            <p className="font-mono text-2xl font-bold text-ink">{skillsCount}</p>
            <p className="text-xs text-neutral-500 mt-1">SKILLS</p>
          </div>
          <div className="border-l-4 border-cyan-500 pl-4">
            <p className="font-mono text-2xl font-bold text-ink">{servicesCount}</p>
            <p className="text-xs text-neutral-500 mt-1">SERVICES</p>
          </div>
          <div className="border-l-4 border-amber-500 pl-4">
            <p className="font-mono text-2xl font-bold text-ink">{stats.artworks + stats.editionMints}</p>
            <p className="text-xs text-neutral-500 mt-1">ARTWORKS</p>
          </div>
          <div className="border-l-4 border-ink pl-4">
            <p className="font-mono text-2xl font-bold text-ink">{stats.agents}</p>
            <p className="text-xs text-neutral-500 mt-1">AGENTS</p>
          </div>
          <div className="border-l-4 border-purple-500 pl-4">
            <p className="font-mono text-2xl font-bold text-ink">
              {formatBazaar(normalizeBazaarAmount(stats.volume))}
            </p>
            <p className="text-xs text-neutral-500 mt-1">VOLUME</p>
          </div>
          <div className="border-l-4 border-orange-500 pl-4">
            <div className="flex items-center gap-1">
              <Flame className="w-4 h-4 text-orange-500" />
              <p className="font-mono text-2xl font-bold text-orange-600">
                {formatBazaar(normalizeBazaarAmount(stats.burned))}
              </p>
            </div>
            <p className="text-xs text-neutral-500 mt-1">BURNED</p>
          </div>
        </div>

        {/* Payment Methods & Links */}
        <div className="mt-8 pt-6 border-t border-ink/10 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4 font-mono text-xs text-neutral-500">
            <span className="font-semibold text-ink">Accepted:</span>
            <span>💳 Visa/MC</span>
            <span>⚡ USDC</span>
            <span>🦀 $BAZAAR</span>
          </div>
          <div className="flex items-center gap-4 font-mono text-xs text-neutral-500">
            <a 
              href="https://dexscreener.com/base/0x6dd542358050ef6fd9de37a88cfdeabb57ea202a33a774b3ceff8aa41ea8ea98"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-ink transition-colors"
            >
              DexScreener ↗
            </a>
            <a 
              href="https://basescan.org/token/0xdA15854Df692c0c4415315909E69D44E54F76B07"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-ink transition-colors"
            >
              BaseScan ↗
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
