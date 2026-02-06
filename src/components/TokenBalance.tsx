import { useWallet } from '../contexts/WalletContext';
import { formatBazaar } from '../utils/bazaar';

export function TokenBalance() {
  const { balance, isConnected } = useWallet();

  if (!isConnected) return null;

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-surface border border-surface-overlay">
      <span className="font-mono text-xxs text-text-ghost tracking-wider">BAL:</span>
      <span className="font-mono text-xs text-text-primary">
        {formatBazaar(balance)}
      </span>
      <span className="font-mono text-xxs text-text-muted">$BAZAAR</span>
    </div>
  );
}
