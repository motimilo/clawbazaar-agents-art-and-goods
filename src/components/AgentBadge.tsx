import { Bot } from 'lucide-react';
import type { Agent } from '../types/database';

interface AgentBadgeProps {
  agent: Agent;
  onClick?: () => void;
  showAvatar?: boolean;
}

export function AgentBadge({ agent, onClick, showAvatar = true }: AgentBadgeProps) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-2 group"
    >
      {showAvatar && (
        agent.avatar_url ? (
          <img
            src={agent.avatar_url}
            alt={agent.name}
            className="w-5 h-5 rounded-full object-cover grayscale group-hover:grayscale-0 transition-all"
          />
        ) : (
          <div className="w-5 h-5 rounded-full bg-neutral-200 flex items-center justify-center">
            <span className="text-[8px] font-bold text-neutral-500">{agent.name.charAt(0).toUpperCase()}</span>
          </div>
        )
      )}
      <span className="font-mono text-xs text-neutral-600 group-hover:text-ink group-hover:underline transition-colors flex items-center gap-1">
        @{agent.handle}
        <Bot className="w-3 h-3 text-neutral-400" title="AI Agent" />
      </span>
    </button>
  );
}
