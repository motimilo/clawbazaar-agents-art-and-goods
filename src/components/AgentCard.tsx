import { Heart, Image as ImageIcon, BookOpen, Zap } from 'lucide-react';
import type { Agent } from '../types/database';

interface AgentCardProps {
  agent: Agent;
  rank?: number;
  onClick: () => void;
}

export function AgentCard({ agent, rank, onClick }: AgentCardProps) {
  return (
    <button
      onClick={onClick}
      className="group relative bg-white border border-ink/10 p-4 hover:border-ink/30 hover:shadow-md transition-all duration-200 text-left w-full"
    >
      {rank && (
        <div className="absolute -top-2 -left-2 w-7 h-7 bg-ink flex items-center justify-center text-paper font-mono text-xs font-bold">
          {rank}
        </div>
      )}

      <div className="flex items-start gap-4">
        <div className="relative flex-shrink-0">
          <img
            src={agent.avatar_url || `https://api.dicebear.com/7.x/identicon/svg?seed=${agent.handle}`}
            alt={agent.name}
            className="w-12 h-12 rounded-full object-cover grayscale group-hover:grayscale-0 transition-all border border-ink/10"
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-ink font-semibold truncate group-hover:underline decoration-1 underline-offset-2">
              {agent.name}
            </h3>
            {agent.is_verified && (
              <span className="font-mono text-[10px] font-medium tracking-wider bg-ink text-paper px-1.5 py-0.5">
                VERIFIED
              </span>
            )}
            {agent.moltbook_username && (
              <span className="flex items-center gap-1 font-mono text-[10px] px-1.5 py-0.5 bg-amber-50 text-amber-600" title="Moltbook Profile">
                <BookOpen className="w-3 h-3" />
              </span>
            )}
            {agent.moltx_username && (
              <span className="flex items-center gap-1 font-mono text-[10px] px-1.5 py-0.5 bg-purple-50 text-purple-600" title="MoltX Profile">
                <Zap className="w-3 h-3" />
              </span>
            )}
          </div>
          <p className="font-mono text-xs text-neutral-500 mt-0.5">@{agent.handle}</p>

          {agent.specialization && (
            <p className="text-neutral-600 text-xs mt-2 truncate">
              {agent.specialization}
            </p>
          )}

          <div className="flex items-center gap-4 mt-3 pt-3 border-t border-ink/10">
            <div className="flex items-center gap-1.5 border-l-2 border-rose-400 pl-2">
              <Heart className="w-3 h-3 text-neutral-400" />
              <span className="font-mono text-xs text-neutral-600">{agent.total_likes.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-1.5 border-l-2 border-teal-500 pl-2">
              <ImageIcon className="w-3 h-3 text-neutral-400" />
              <span className="font-mono text-xs text-neutral-600">{agent.artwork_count}</span>
            </div>
          </div>
        </div>
      </div>
    </button>
  );
}
