import { Download, Star, Tag, Package, CreditCard, Coins } from 'lucide-react';
import type { Skill } from '../types/marketplace';
import { getAvailablePaymentMethods, formatPrice, type PaymentMethod } from '../lib/payments';

interface SkillCardProps {
  skill: Skill;
  onDownload?: (skill: Skill) => void;
  onBuy?: (skill: Skill, method: PaymentMethod) => void;
}

export function SkillCard({ skill, onDownload, onBuy }: SkillCardProps) {
  const paymentMethods = getAvailablePaymentMethods(skill.price_usdc, skill.price_bazaar ? Number(skill.price_bazaar) : undefined);
  const isFree = paymentMethods.length === 0;
  
  const bazaarPrice = skill.price_bazaar ? Number(skill.price_bazaar) : null;
  const primaryPrice = skill.price_usdc 
    ? formatPrice(skill.price_usdc, 'USDC')
    : bazaarPrice 
      ? formatPrice(bazaarPrice, 'BAZAAR')
      : 'Free';

  const handleAction = (method?: PaymentMethod) => {
    if (isFree) {
      onDownload?.(skill);
    } else if (method) {
      onBuy?.(skill, method);
    }
  };

  return (
    <div className="bg-black/40 border border-green-500/30 rounded-lg p-4 hover:border-green-500/60 transition-all group">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <Package className="w-5 h-5 text-green-400" />
          <h3 className="font-mono text-green-300 font-semibold truncate">
            {skill.name}
          </h3>
        </div>
        <span className="text-xs font-mono text-green-500/70 bg-green-500/10 px-2 py-0.5 rounded">
          v{skill.version}
        </span>
      </div>

      {/* Description */}
      <p className="text-green-100/70 text-sm mb-3 line-clamp-2">
        {skill.description || 'No description provided'}
      </p>

      {/* Tags */}
      {skill.tags && skill.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {skill.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="text-xs font-mono text-green-400/70 bg-green-500/10 px-2 py-0.5 rounded"
            >
              {tag}
            </span>
          ))}
          {skill.tags.length > 3 && (
            <span className="text-xs text-green-500/50">+{skill.tags.length - 3}</span>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="flex items-center gap-4 text-xs text-green-500/70 mb-4">
        <div className="flex items-center gap-1">
          <Download className="w-3 h-3" />
          <span>{skill.downloads.toLocaleString()}</span>
        </div>
        {skill.rating && (
          <div className="flex items-center gap-1">
            <Star className="w-3 h-3" />
            <span>{skill.rating.toFixed(1)}</span>
          </div>
        )}
        {skill.category && (
          <div className="flex items-center gap-1">
            <Tag className="w-3 h-3" />
            <span>{skill.category}</span>
          </div>
        )}
      </div>

      {/* Payment Options */}
      {!isFree && (
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs text-green-500/50">Pay with:</span>
          {paymentMethods.includes('fiat') && (
            <span className="flex items-center gap-1 text-xs bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded border border-blue-500/30">
              <CreditCard className="w-3 h-3" />
              Card
            </span>
          )}
          {paymentMethods.includes('x402') && (
            <span className="flex items-center gap-1 text-xs bg-green-500/20 text-green-300 px-2 py-0.5 rounded border border-green-500/30">
              ⚡ USDC
            </span>
          )}
          {paymentMethods.includes('bazaar') && (
            <span className="flex items-center gap-1 text-xs bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded border border-amber-500/30">
              <Coins className="w-3 h-3" />
              $BAZAAR
            </span>
          )}
        </div>
      )}

      {/* Price & Action Buttons */}
      <div className="flex items-center justify-between pt-3 border-t border-green-500/20">
        <span className={`font-mono font-bold ${isFree ? 'text-green-400' : 'text-green-300'}`}>
          {primaryPrice}
        </span>
        
        {isFree ? (
          <button
            onClick={() => handleAction()}
            className="flex items-center gap-2 px-3 py-1.5 bg-green-500/20 hover:bg-green-500/30 
                       border border-green-500/50 rounded font-mono text-sm text-green-300
                       transition-all group-hover:border-green-400"
          >
            <Download className="w-4 h-4" />
            Download
          </button>
        ) : (
          <div className="flex gap-2">
            {paymentMethods.includes('fiat') && (
              <button
                onClick={() => handleAction('fiat')}
                className="flex items-center gap-1 px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 
                           border border-blue-500/50 rounded font-mono text-xs text-blue-300
                           transition-all"
                title="Pay with card"
              >
                <CreditCard className="w-3 h-3" />
                Card
              </button>
            )}
            {paymentMethods.includes('x402') && (
              <button
                onClick={() => handleAction('x402')}
                className="flex items-center gap-1 px-3 py-1.5 bg-green-500/20 hover:bg-green-500/30 
                           border border-green-500/50 rounded font-mono text-xs text-green-300
                           transition-all"
                title="Pay with USDC (x402)"
              >
                ⚡
              </button>
            )}
            {paymentMethods.includes('bazaar') && (
              <button
                onClick={() => handleAction('bazaar')}
                className="flex items-center gap-1 px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 
                           border border-amber-500/50 rounded font-mono text-xs text-amber-300
                           transition-all"
                title="Pay with $BAZAAR"
              >
                🦀
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
