import { Heart, Layers, ExternalLink } from 'lucide-react';
import type { Agent } from '../types/database';

interface AgentCardProps {
  agent: Agent;
  rank?: number;
  onClick: () => void;
}

export function AgentCard({ agent, rank, onClick }: AgentCardProps) {
  // Get avatar URL with dicebear fallback
  const getAvatarUrl = () => {
    if (agent.avatar_url) return agent.avatar_url;
    return `https://api.dicebear.com/7.x/identicon/svg?seed=${agent.handle}`;
  };

  return (
    <button
      onClick={onClick}
      className="group relative bg-void p-4 text-left w-full hover:bg-surface transition-colors"
    >
      {/* Rank Badge */}
      {rank && (
        <div className="absolute top-0 right-0 font-mono text-4xl font-bold text-surface-overlay leading-none">
          {String(rank).padStart(2, '0')}
        </div>
      )}

      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div className="relative flex-shrink-0">
          <img
            src={getAvatarUrl()}
            alt={agent.name}
            className="w-12 h-12 object-cover grayscale group-hover:grayscale-0 transition-all"
          />
          {agent.is_verified && (
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-signal-live flex items-center justify-center">
              <span className="text-void text-xxs font-bold">✓</span>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h3 className="text-text-primary font-medium truncate group-hover:underline underline-offset-2">
              {agent.name}
            </h3>
          </div>
          
          <p className="font-mono text-xs text-text-muted">@{agent.handle}</p>

          {agent.specialization && (
            <p className="text-text-secondary text-xs mt-2 line-clamp-2">
              {agent.specialization}
            </p>
          )}

          {/* Stats */}
          <div className="flex items-center gap-4 mt-3 pt-3 border-t border-surface-overlay">
            <div className="flex items-center gap-1.5">
              <Heart className="w-3 h-3 text-text-ghost" />
              <span className="font-mono text-xs text-text-muted">{agent.total_likes.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Layers className="w-3 h-3 text-text-ghost" />
              <span className="font-mono text-xs text-text-muted">{agent.artwork_count}</span>
            </div>
            {(agent.moltbook_username || agent.moltx_username) && (
              <div className="flex items-center gap-1.5 ml-auto">
                <ExternalLink className="w-3 h-3 text-text-ghost" />
                <span className="font-mono text-xxs text-text-ghost">LINKED</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom data strip */}
      <div className="mt-3 pt-2 border-t border-surface-overlay flex items-center justify-between">
        <span className="font-mono text-xxs text-text-ghost">
          AGENT_ID: {agent.id.slice(0, 8)}
        </span>
        <span className="font-mono text-xxs text-text-ghost">
          {agent.wallet_address ? `${agent.wallet_address.slice(0, 6)}...${agent.wallet_address.slice(-4)}` : 'NO_WALLET'}
        </span>
      </div>
    </button>
  );
}
