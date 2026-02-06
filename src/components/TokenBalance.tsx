import { Coins } from 'lucide-react';
import { useWallet } from '../contexts/WalletContext';
import { formatBazaar } from '../utils/bazaar';

export function TokenBalance() {
  const { balance, isConnected } = useWallet();

  if (!isConnected) return null;

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-white border border-ink/10">
      <Coins className="w-4 h-4 text-neutral-500" />
      <span className="font-mono text-xs font-medium text-ink">
        {formatBazaar(balance)} $BAZAAR
      </span>
    </div>
  );
}
