import { useState, useEffect } from 'react';
import { Package, Zap, FileText, Search, Filter, ArrowLeft } from 'lucide-react';
import { SkillCard } from '../components/SkillCard';
import { ServiceCard } from '../components/ServiceCard';
import { fetchSkills } from '../lib/skills-api';
import { fetchServices } from '../lib/services-api';
import { fetchPrompts } from '../lib/prompts-api';
import type { Skill, Service, Prompt } from '../types/marketplace';

type TabType = 'skills' | 'services' | 'prompts';

interface SkillsHubProps {
  onBack?: () => void;
}

export function SkillsHub({ onBack }: SkillsHubProps) {
  const [activeTab, setActiveTab] = useState<TabType>('skills');
  const [skills, setSkills] = useState<Skill[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest');

  useEffect(() => {
    loadData();
  }, [activeTab, sortBy]);

  async function loadData() {
    setLoading(true);
    try {
      switch (activeTab) {
        case 'skills':
          const skillsData = await fetchSkills({ sort: sortBy as any, limit: 20 });
          setSkills(skillsData);
          break;
        case 'services':
          const servicesData = await fetchServices({ sort: sortBy as any, limit: 20 });
          setServices(servicesData);
          break;
        case 'prompts':
          const promptsData = await fetchPrompts({ sort: sortBy as any, limit: 20 });
          setPrompts(promptsData);
          break;
      }
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  }

  const tabs = [
    { id: 'skills' as const, label: 'Skills', icon: Package, color: 'green' },
    { id: 'services' as const, label: 'Services', icon: Zap, color: 'cyan' },
    { id: 'prompts' as const, label: 'Prompts', icon: FileText, color: 'purple' },
  ];

  const getColorClasses = (color: string, isActive: boolean) => {
    const colors: Record<string, { active: string; inactive: string }> = {
      green: {
        active: 'text-green-300 border-green-400 bg-green-500/10',
        inactive: 'text-green-500/70 border-transparent hover:text-green-400',
      },
      cyan: {
        active: 'text-cyan-300 border-cyan-400 bg-cyan-500/10',
        inactive: 'text-cyan-500/70 border-transparent hover:text-cyan-400',
      },
      purple: {
        active: 'text-purple-300 border-purple-400 bg-purple-500/10',
        inactive: 'text-purple-500/70 border-transparent hover:text-purple-400',
      },
    };
    return isActive ? colors[color].active : colors[color].inactive;
  };

  return (
    <div className="min-h-screen bg-black text-green-100">
      {/* Header */}
      <div className="border-b border-green-500/30 bg-black/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              {onBack && (
                <button
                  onClick={onBack}
                  className="text-green-500/70 hover:text-green-400 transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
              )}
              <h1 className="text-2xl font-mono font-bold text-green-400">
                Skills Hub
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-xs">
                <span className="text-green-500/50">Pay with:</span>
                <span className="font-mono px-2 py-1 bg-blue-500/10 text-blue-300 rounded border border-blue-500/30">
                  💳 Card
                </span>
                <span className="font-mono px-2 py-1 bg-green-500/10 text-green-300 rounded border border-green-500/30">
                  ⚡ USDC
                </span>
                <span className="font-mono px-2 py-1 bg-amber-500/10 text-amber-300 rounded border border-amber-500/30">
                  🦀 $BAZAAR
                </span>
              </div>
              <button
                onClick={() => window.location.href = '/publish'}
                className="px-3 py-1.5 bg-green-500/20 hover:bg-green-500/30 
                           border border-green-500/50 rounded font-mono text-sm text-green-300
                           transition-all hover:border-green-400"
              >
                + Publish
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-4">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 font-mono text-sm rounded-t-lg
                           border-b-2 transition-all ${getColorClasses(tab.color, activeTab === tab.id)}`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500/50" />
            <input
              type="text"
              placeholder={`Search ${activeTab}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-black/50 border border-green-500/30 rounded-lg pl-10 pr-4 py-2
                        font-mono text-sm text-green-100 placeholder-green-500/50
                        focus:outline-none focus:border-green-500/60"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500/50" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-black/50 border border-green-500/30 rounded-lg pl-10 pr-8 py-2
                        font-mono text-sm text-green-100 appearance-none cursor-pointer
                        focus:outline-none focus:border-green-500/60"
            >
              <option value="newest">Newest</option>
              <option value="downloads">Most Downloaded</option>
              <option value="rating">Top Rated</option>
            </select>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-pulse text-green-500/70 font-mono">
              Loading {activeTab}...
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeTab === 'skills' && skills.map((skill) => (
              <SkillCard 
                key={skill.id} 
                skill={skill}
                onDownload={(s) => window.open(s.package_url, '_blank')}
              />
            ))}
            {activeTab === 'services' && services.map((service) => (
              <ServiceCard 
                key={service.id} 
                service={service}
                onCall={(s) => console.log('Call service:', s.id)}
              />
            ))}
            {activeTab === 'prompts' && prompts.map((prompt) => (
              <div 
                key={prompt.id}
                className="bg-black/40 border border-purple-500/30 rounded-lg p-4 hover:border-purple-500/60 transition-all"
              >
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="w-5 h-5 text-purple-400" />
                  <h3 className="font-mono text-purple-300 font-semibold">{prompt.name}</h3>
                </div>
                <p className="text-purple-100/70 text-sm mb-3 line-clamp-2">
                  {prompt.description || 'No description'}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-purple-500/70">
                    {prompt.model_target || 'Any model'}
                  </span>
                  <span className="text-xs text-purple-500/70">
                    {prompt.uses.toLocaleString()} uses
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && (
          (activeTab === 'skills' && skills.length === 0) ||
          (activeTab === 'services' && services.length === 0) ||
          (activeTab === 'prompts' && prompts.length === 0)
        ) && (
          <div className="text-center py-20">
            <div className="text-green-500/50 font-mono mb-2">
              No {activeTab} found
            </div>
            <p className="text-green-500/30 text-sm">
              Be the first to publish!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
