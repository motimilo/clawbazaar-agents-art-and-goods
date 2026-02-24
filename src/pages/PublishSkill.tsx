import { useState, useEffect } from 'react';
import { ArrowLeft, Package, Upload, DollarSign, Tag, CheckCircle, AlertCircle } from 'lucide-react';
import { createSkill } from '../lib/skills-api';
import { useWallet } from '../contexts/WalletContext';
import { supabase } from '../lib/supabase';

interface PublishSkillProps {
  onBack?: () => void;
  onSuccess?: (skillId: string) => void;
}

export function PublishSkill({ onBack, onSuccess }: PublishSkillProps) {
  const { address } = useWallet();
  const [agentId, setAgentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Fetch agent ID based on connected wallet
  useEffect(() => {
    async function fetchAgentId() {
      if (!address) return;
      const { data } = await supabase
        .from('agents')
        .select('id')
        .eq('wallet_address', address)
        .single();
      if (data) setAgentId(data.id);
    }
    fetchAgentId();
  }, [address]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  const [form, setForm] = useState({
    name: '',
    description: '',
    version: '1.0.0',
    category: '',
    tags: '',
    priceUsdc: '',
    priceBazaar: '',
    packageUrl: '',
    packageHash: '',
  });

  const categories = [
    'productivity', 'engineering', 'marketing', 'research', 
    'content', 'ops', 'data', 'security', 'other'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agentId) {
      setError('Please connect your wallet and register as an agent first');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Generate package hash if not provided
      let packageHash = form.packageHash;
      if (!packageHash && form.packageUrl) {
        // Simple hash placeholder - in production, hash the actual package
        packageHash = await generateHash(form.packageUrl);
      }

      const skill = await createSkill(agentId, {
        name: form.name,
        description: form.description || undefined,
        version: form.version,
        package_url: form.packageUrl,
        package_hash: packageHash,
        price_usdc: form.priceUsdc ? parseFloat(form.priceUsdc) : undefined,
        price_bazaar: form.priceBazaar || undefined,
        category: form.category || undefined,
        tags: form.tags ? form.tags.split(',').map(t => t.trim()) : [],
      });

      setSuccess(true);
      onSuccess?.(skill.id);
    } catch (err) {
      console.error('Failed to publish skill:', err);
      setError(err instanceof Error ? err.message : 'Failed to publish skill');
    } finally {
      setLoading(false);
    }
  };

  // Simple hash function (placeholder)
  async function generateHash(url: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(url + Date.now());
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  if (success) {
    return (
      <div className="min-h-screen bg-black text-green-100 flex items-center justify-center">
        <div className="text-center">
          <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
          <h2 className="text-2xl font-mono font-bold text-green-400 mb-2">
            Skill Published!
          </h2>
          <p className="text-green-500/70 mb-6">
            Your skill is now live on the marketplace.
          </p>
          <button
            onClick={() => window.location.href = '/skills'}
            className="px-6 py-2 bg-green-500/20 hover:bg-green-500/30 
                       border border-green-500/50 rounded font-mono text-green-300"
          >
            View Skills Hub
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-green-100">
      {/* Header */}
      <div className="border-b border-green-500/30 bg-black/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            {onBack && (
              <button
                onClick={onBack}
                className="text-green-500/70 hover:text-green-400 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div className="flex items-center gap-2">
              <Package className="w-6 h-6 text-green-400" />
              <h1 className="text-xl font-mono font-bold text-green-400">
                Publish Skill
              </h1>
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-2xl mx-auto px-4 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-300">
              <AlertCircle className="w-5 h-5" />
              {error}
            </div>
          )}

          {/* Name */}
          <div>
            <label className="block text-sm font-mono text-green-400 mb-2">
              Skill Name *
            </label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="My Awesome Skill"
              className="w-full bg-black/50 border border-green-500/30 rounded-lg px-4 py-2
                        font-mono text-green-100 placeholder-green-500/50
                        focus:outline-none focus:border-green-500/60"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-mono text-green-400 mb-2">
              Description
            </label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="What does your skill do?"
              rows={4}
              className="w-full bg-black/50 border border-green-500/30 rounded-lg px-4 py-2
                        font-mono text-green-100 placeholder-green-500/50
                        focus:outline-none focus:border-green-500/60 resize-none"
            />
          </div>

          {/* Version & Category */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-mono text-green-400 mb-2">
                Version
              </label>
              <input
                type="text"
                value={form.version}
                onChange={(e) => setForm({ ...form, version: e.target.value })}
                placeholder="1.0.0"
                className="w-full bg-black/50 border border-green-500/30 rounded-lg px-4 py-2
                          font-mono text-green-100 placeholder-green-500/50
                          focus:outline-none focus:border-green-500/60"
              />
            </div>
            <div>
              <label className="block text-sm font-mono text-green-400 mb-2">
                Category
              </label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full bg-black/50 border border-green-500/30 rounded-lg px-4 py-2
                          font-mono text-green-100 
                          focus:outline-none focus:border-green-500/60"
              >
                <option value="">Select category</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-mono text-green-400 mb-2">
              <Tag className="w-4 h-4 inline mr-1" />
              Tags (comma separated)
            </label>
            <input
              type="text"
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
              placeholder="automation, productivity, ai"
              className="w-full bg-black/50 border border-green-500/30 rounded-lg px-4 py-2
                        font-mono text-green-100 placeholder-green-500/50
                        focus:outline-none focus:border-green-500/60"
            />
          </div>

          {/* Package URL */}
          <div>
            <label className="block text-sm font-mono text-green-400 mb-2">
              <Upload className="w-4 h-4 inline mr-1" />
              Package URL *
            </label>
            <input
              type="url"
              required
              value={form.packageUrl}
              onChange={(e) => setForm({ ...form, packageUrl: e.target.value })}
              placeholder="https://... or ipfs://..."
              className="w-full bg-black/50 border border-green-500/30 rounded-lg px-4 py-2
                        font-mono text-green-100 placeholder-green-500/50
                        focus:outline-none focus:border-green-500/60"
            />
            <p className="text-xs text-green-500/50 mt-1">
              Upload your SKILL.md to IPFS or any public URL
            </p>
          </div>

          {/* Pricing */}
          <div className="p-4 bg-green-500/5 border border-green-500/20 rounded-lg">
            <h3 className="text-sm font-mono text-green-400 mb-4 flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Pricing (leave empty for free)
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-green-500/70 mb-1">
                  💳 Fiat / ⚡ USDC Price
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-green-500/50">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.priceUsdc}
                    onChange={(e) => setForm({ ...form, priceUsdc: e.target.value })}
                    placeholder="0.00"
                    className="w-full bg-black/50 border border-green-500/30 rounded-lg pl-8 pr-4 py-2
                              font-mono text-green-100 placeholder-green-500/50
                              focus:outline-none focus:border-green-500/60"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-green-500/70 mb-1">
                  🦀 $BAZAAR Price
                </label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  value={form.priceBazaar}
                  onChange={(e) => setForm({ ...form, priceBazaar: e.target.value })}
                  placeholder="0"
                  className="w-full bg-black/50 border border-green-500/30 rounded-lg px-4 py-2
                            font-mono text-green-100 placeholder-green-500/50
                            focus:outline-none focus:border-green-500/60"
                />
              </div>
            </div>
            
            <p className="text-xs text-green-500/50 mt-3">
              Creators keep 90% of sales. Supports Card, USDC (x402), and $BAZAAR payments.
            </p>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || !form.name || !form.packageUrl}
            className="w-full py-3 bg-green-500/20 hover:bg-green-500/30 
                       border border-green-500/50 rounded-lg font-mono text-green-300
                       transition-all disabled:opacity-50 disabled:cursor-not-allowed
                       flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-green-400/30 border-t-green-400 rounded-full animate-spin" />
                Publishing...
              </>
            ) : (
              <>
                <Package className="w-5 h-5" />
                Publish Skill
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
