import { useState, useEffect } from 'react';
import { Layers, Clock, ArrowRight, Users } from 'lucide-react';
import type { Edition, Agent } from '../types/database';

interface EditionCardProps {
  edition: Edition;
  agent?: Agent;
  onClick: () => void;
  onMint?: () => void;
}

export function EditionCard({ edition, agent, onClick, onMint }: EditionCardProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<string | null>(null);

  const progress = (edition.total_minted / edition.max_supply) * 100;
  const remaining = edition.max_supply - edition.total_minted;
  const isSoldOut = remaining === 0;

  useEffect(() => {
    if (!edition.mint_end) return;

    const updateTime = () => {
      const end = new Date(edition.mint_end!).getTime();
      const now = Date.now();
      const diff = end - now;

      if (diff <= 0) {
        setTimeRemaining('Ended');
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      if (hours > 24) {
        const days = Math.floor(hours / 24);
        setTimeRemaining(`${days}d ${hours % 24}h`);
      } else {
        setTimeRemaining(`${hours}h ${minutes}m`);
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, [edition.mint_end]);

  const handleMint = (e: React.MouseEvent) => {
    e.stopPropagation();
    onMint?.();
  };

  return (
    <article
      onClick={onClick}
      className="group relative bg-white border border-ink/10 overflow-hidden hover:border-ink/30 hover:shadow-lg transition-all duration-300 cursor-pointer"
    >
      <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5">
        <span className="font-mono text-[10px] font-medium tracking-wider bg-white px-2 py-1 border border-ink/10 flex items-center gap-1">
          <Layers className="w-3 h-3" />
          EDITION
        </span>
        {isSoldOut && (
          <span className="font-mono text-[10px] font-medium tracking-wider bg-ink text-paper px-2 py-1">
            SOLD OUT
          </span>
        )}
      </div>

      {edition.is_active && !isSoldOut && (
        <div className="absolute top-3 right-3 z-10">
          <span className="font-mono text-[10px] font-medium tracking-wider bg-emerald-600 text-white px-2 py-1">
            {edition.price_bzaar} $BZAAR
          </span>
        </div>
      )}

      <div className="relative aspect-[4/5] overflow-hidden bg-neutral-100 border-b border-ink/10">
        {!imageLoaded && (
          <div className="absolute inset-0 bg-neutral-100 animate-pulse" />
        )}
        <img
          src={edition.image_url}
          alt={edition.title}
          onLoad={() => setImageLoaded(true)}
          className={`w-full h-full object-cover group-hover:scale-105 transition-all duration-500 ${
            imageLoaded ? 'opacity-100' : 'opacity-0'
          }`}
        />

        {edition.is_active && !isSoldOut && onMint && (
          <div className="absolute inset-0 flex items-end p-4 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-t from-ink/90 via-ink/40 to-transparent">
            <button
              onClick={handleMint}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white text-ink font-mono text-xs font-medium tracking-wider hover:bg-paper transition-colors group/btn"
            >
              MINT_EDITION
              <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
            </button>
          </div>
        )}
      </div>

      <div className="p-4">
        <h3 className="text-ink font-semibold truncate group-hover:underline decoration-1 underline-offset-2">
          {edition.title}
        </h3>

        {agent && (
          <div className="flex items-center gap-2 mt-2">
            {agent.avatar_url ? (
              <img
                src={agent.avatar_url}
                alt={agent.name}
                className="w-5 h-5 rounded-full object-cover grayscale group-hover:grayscale-0 transition-all"
              />
            ) : (
              <div className="w-5 h-5 rounded-full bg-neutral-200 flex items-center justify-center">
                <span className="text-[8px] font-bold text-neutral-500">{agent.name.charAt(0).toUpperCase()}</span>
              </div>
            )}
            <span className="font-mono text-xs text-neutral-500">@{agent.handle}</span>
          </div>
        )}

        <div className="mt-4 pt-3 border-t border-ink/10">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 text-neutral-500">
              <Users className="w-3.5 h-3.5" />
              <span className="font-mono text-xs">{edition.total_minted}/{edition.max_supply}</span>
            </div>
            {timeRemaining && (
              <div className="flex items-center gap-1.5 text-neutral-500">
                <Clock className="w-3.5 h-3.5" />
                <span className="font-mono text-xs">{timeRemaining}</span>
              </div>
            )}
          </div>

          <div className="w-full h-1.5 bg-neutral-100 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                isSoldOut ? 'bg-ink' : 'bg-emerald-500'
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="flex items-center justify-between mt-3">
            <div>
              <p className="font-mono text-[10px] text-neutral-400 tracking-wider">PRICE</p>
              <p className="font-mono text-sm font-bold text-ink">{edition.price_bzaar} $BZAAR</p>
            </div>
            <div className="text-right">
              <p className="font-mono text-[10px] text-neutral-400 tracking-wider">REMAINING</p>
              <p className="font-mono text-sm font-bold text-ink">{remaining}</p>
            </div>
          </div>

          <p className="font-mono text-[9px] text-neutral-400 mt-2">5% burned on resale</p>
        </div>
      </div>
    </article>
  );
}
