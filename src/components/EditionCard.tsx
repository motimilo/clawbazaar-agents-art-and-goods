import { useState, useEffect } from 'react';
import { formatBazaar } from '../utils/bazaar';
import type { Edition, Agent } from '../types/database';

interface EditionCardProps {
  edition: Edition;
  agent?: Agent;
  onClick: () => void;
  onMint?: () => void;
}

export function EditionCard({ edition, agent, onClick, onMint }: EditionCardProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
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
        setTimeRemaining('ENDED');
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      if (hours > 24) {
        const days = Math.floor(hours / 24);
        setTimeRemaining(`${days}D ${hours % 24}H`);
      } else {
        setTimeRemaining(`${hours}H ${minutes}M`);
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

  // Generate dicebear avatar as fallback
  const getAvatarUrl = () => {
    if (agent?.avatar_url) return agent.avatar_url;
    if (agent?.handle) return `https://api.dicebear.com/7.x/identicon/svg?seed=${agent.handle}`;
    return null;
  };

  return (
    <article
      onClick={onClick}
      className="group relative bg-void cursor-pointer"
    >
      {/* Image Section */}
      <div className="relative aspect-square overflow-hidden bg-surface">
        {!imageLoaded && !imageError && (
          <div className="absolute inset-0 bg-surface animate-pulse" />
        )}
        {imageError ? (
          <div className="absolute inset-0 bg-surface flex flex-col items-center justify-center">
            <span className="font-mono text-4xl text-text-ghost mb-2">◇</span>
            <span className="font-mono text-xxs text-text-ghost">NO_IMAGE</span>
          </div>
        ) : (
          <img
            src={edition.image_url}
            alt={edition.title}
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageError(true)}
            className={`w-full h-full object-cover transition-all duration-500 ${
              imageLoaded ? 'opacity-100' : 'opacity-0'
            } ${isSoldOut ? 'grayscale' : 'grayscale-[20%] group-hover:grayscale-0'}`}
          />
        )}

        {/* Status Overlay */}
        <div className="absolute top-0 left-0 right-0 p-3 flex items-start justify-between">
          <div className="flex flex-col gap-1">
            {edition.is_active && !isSoldOut && (
              <span className="font-mono text-xxs bg-signal-live text-void px-2 py-0.5 tracking-wider">
                LIVE
              </span>
            )}
            {isSoldOut && (
              <span className="font-mono text-xxs bg-text-primary text-void px-2 py-0.5 tracking-wider">
                SOLD OUT
              </span>
            )}
          </div>
          {timeRemaining && !isSoldOut && (
            <span className="font-mono text-xxs bg-void/80 text-text-secondary px-2 py-0.5 tracking-wider">
              {timeRemaining}
            </span>
          )}
        </div>

        {/* Mint Button - appears on hover */}
        {edition.is_active && !isSoldOut && onMint && (
          <div className="absolute inset-0 flex items-end p-3 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-t from-void/95 via-void/50 to-transparent">
            <button
              onClick={handleMint}
              className="w-full py-3 bg-text-primary text-void font-mono text-xs font-medium tracking-wider hover:bg-text-secondary transition-colors"
            >
              MINT — {formatBazaar(edition.price_bzaar)} $BAZAAR
            </button>
          </div>
        )}
      </div>

      {/* Info Section */}
      <div className="p-4 bg-surface-raised border-t border-surface-overlay">
        {/* Title */}
        <h3 className="font-medium text-text-primary truncate mb-1">
          {edition.title}
        </h3>

        {/* Agent */}
        {agent && (
          <div className="flex items-center gap-2 mb-4">
            {getAvatarUrl() ? (
              <img
                src={getAvatarUrl()!}
                alt={agent.name}
                className="w-4 h-4 grayscale"
              />
            ) : (
              <div className="w-4 h-4 bg-surface flex items-center justify-center">
                <span className="text-xxs font-bold text-text-muted">
                  {agent.name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <span className="font-mono text-xs text-text-muted">@{agent.handle}</span>
          </div>
        )}

        {/* Progress Bar */}
        <div className="mb-3">
          <div className="w-full h-0.5 bg-surface overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                isSoldOut ? 'bg-text-muted' : 'bg-signal-live'
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-2">
          <div>
            <p className="font-mono text-xxs text-text-ghost tracking-wider">MINTED</p>
            <p className="font-mono text-sm text-text-primary">{edition.total_minted}/{edition.max_supply}</p>
          </div>
          <div>
            <p className="font-mono text-xxs text-text-ghost tracking-wider">PRICE</p>
            <p className="font-mono text-sm text-text-primary">{formatBazaar(edition.price_bzaar)}</p>
          </div>
          <div className="text-right">
            <p className="font-mono text-xxs text-text-ghost tracking-wider">LEFT</p>
            <p className="font-mono text-sm text-text-primary">{remaining}</p>
          </div>
        </div>

        {/* Edition ID Footer */}
        <div className="mt-3 pt-2 border-t border-surface-overlay">
          <p className="font-mono text-xxs text-text-ghost">
            ED#{edition.edition_id_on_chain ?? '—'} • 5% BURN
          </p>
        </div>
      </div>
    </article>
  );
}
