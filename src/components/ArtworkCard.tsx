import { useState } from 'react';
import { Heart, ArrowRight, Hexagon } from 'lucide-react';
import { useOnChainMetadata } from '../hooks/useOnChainMetadata';
import { getValidImageUrl, PLACEHOLDER_IMAGE } from '../utils/imageUtils';
import { formatBazaar } from '../utils/bazaar';
import type { Artwork, Agent } from '../types/database';

interface ArtworkCardProps {
  artwork: Artwork;
  agent?: Agent;
  onLike: () => void;
  onClick: () => void;
  onBuy?: () => void;
  isLiked?: boolean;
  showPrice?: boolean;
}

export function ArtworkCard({ artwork, agent, onLike, onClick, onBuy, isLiked = false, showPrice = false }: ArtworkCardProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [localLiked, setLocalLiked] = useState(isLiked);
  const [localLikes, setLocalLikes] = useState(artwork.likes_count);

  const isMinted = artwork.nft_status === 'minted' && artwork.token_id !== null;
  const { metadata } = useOnChainMetadata(
    isMinted ? artwork.token_id : null,
    isMinted ? artwork.contract_address : null
  );

  // Prefer database image_url if it's a local path (starts with /), otherwise use on-chain image
  // This allows curated images to override on-chain placeholders
  const dbImage = getValidImageUrl(artwork.image_url);
  const onChainImage = getValidImageUrl(metadata?.image);
  const displayImage = (dbImage && dbImage.startsWith('/')) ? dbImage : (onChainImage || dbImage || PLACEHOLDER_IMAGE);

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!localLiked) {
      setLocalLiked(true);
      setLocalLikes((prev) => prev + 1);
      onLike();
    }
  };

  const handleBuy = (e: React.MouseEvent) => {
    e.stopPropagation();
    onBuy?.();
  };

  const isForSale = artwork.is_for_sale && artwork.price_bzaar;
  const isOwnedByUser = artwork.current_owner_type === 'user';

  return (
    <article
      onClick={onClick}
      className="group relative bg-white border border-ink/10 overflow-hidden hover:border-ink/30 hover:shadow-lg transition-all duration-300 cursor-pointer"
    >
      <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5">
        {artwork.featured && (
          <span className="font-mono text-[10px] font-medium tracking-wider bg-white px-2 py-1 border border-ink/10">
            FEATURED
          </span>
        )}
        {isMinted && (
          <span className="font-mono text-[10px] font-medium tracking-wider bg-white px-2 py-1 border border-ink/10 flex items-center gap-1">
            <Hexagon className="w-3 h-3" />
            NFT
          </span>
        )}
        {isOwnedByUser && (
          <span className="font-mono text-[10px] font-medium tracking-wider bg-ink text-paper px-2 py-1">
            OWNED
          </span>
        )}
      </div>

      {isForSale && (
        <div className="absolute top-3 right-3 z-10">
          <span className="font-mono text-[10px] font-medium tracking-wider bg-emerald-600 text-white px-2 py-1">
            {formatBazaar(artwork.price_bzaar)} $BAZAAR
          </span>
        </div>
      )}

      <div className="relative aspect-[4/5] overflow-hidden bg-neutral-100 border-b border-ink/10">
        {!imageLoaded && (
          <div className="absolute inset-0 bg-neutral-100 animate-pulse" />
        )}
        <img
          src={displayImage}
          alt={artwork.title}
          onLoad={() => setImageLoaded(true)}
          className={`w-full h-full object-cover group-hover:scale-105 transition-all duration-500 ${
            imageLoaded ? 'opacity-100' : 'opacity-0'
          }`}
        />

        {isForSale && onBuy && (
          <div className="absolute inset-0 flex items-end p-4 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-t from-ink/90 via-ink/40 to-transparent">
            <button
              onClick={handleBuy}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white text-ink font-mono text-xs font-medium tracking-wider hover:bg-paper transition-colors group/btn"
            >
              EXECUTE_BUY
              <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
            </button>
          </div>
        )}
      </div>

      <div className="p-4">
        <h3 className="text-ink font-semibold truncate group-hover:underline decoration-1 underline-offset-2">
          {artwork.title}
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

        <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-ink/10">
          {showPrice && isForSale ? (
            <div>
              <p className="font-mono text-[10px] text-neutral-400 tracking-wider">PRICE</p>
              <p className="font-mono text-sm font-bold text-ink">{formatBazaar(artwork.price_bzaar)} $BAZAAR</p>
              <p className="font-mono text-[9px] text-neutral-400 mt-0.5">5% burned · royalties enforced</p>
            </div>
          ) : (
            <div>
              <p className="font-mono text-[10px] text-neutral-400 tracking-wider">STYLE</p>
              <p className="text-sm text-ink truncate">{artwork.style || 'Mixed'}</p>
            </div>
          )}

          <div className="flex items-center justify-end gap-2">
            <button
              onClick={handleLike}
              className={`flex items-center gap-1.5 px-2 py-1 transition-colors ${
                localLiked
                  ? 'text-rose-500'
                  : 'text-neutral-400 hover:text-ink'
              }`}
            >
              <Heart className={`w-4 h-4 ${localLiked ? 'fill-current' : ''}`} />
              <span className="font-mono text-xs">{localLikes}</span>
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
