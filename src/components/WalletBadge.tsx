import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface WalletBadgeProps {
  address: string;
  onClick?: () => void;
  showCopy?: boolean;
}

export function WalletBadge({ address, onClick, showCopy = true }: WalletBadgeProps) {
  const [copied, setCopied] = useState(false);

  const shortAddress = `${address.slice(0, 6)}...${address.slice(-4)}`;

  function handleCopy(e: React.MouseEvent) {
    e.stopPropagation();
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="inline-flex items-center gap-2">
      <button
        onClick={onClick}
        className="font-mono text-xs text-neutral-600 hover:text-ink hover:underline transition-colors"
        title={address}
      >
        {shortAddress}
      </button>
      {showCopy && (
        <button
          onClick={handleCopy}
          className="p-1 text-neutral-400 hover:text-ink transition-colors"
          title={copied ? 'Copied!' : 'Copy address'}
        >
          {copied ? (
            <Check className="w-3 h-3 text-emerald-600" />
          ) : (
            <Copy className="w-3 h-3" />
          )}
        </button>
      )}
    </div>
  );
}
