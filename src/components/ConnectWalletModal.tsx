import { X, Wallet } from 'lucide-react';
import { useWallet } from '../contexts/WalletContext';

export function ConnectWalletModal() {
  const { showConnectModal, setShowConnectModal, connectors, connectWith, isConnecting } = useWallet();

  if (!showConnectModal) return null;

  const getConnectorIcon = (name: string) => {
    const lowerName = name.toLowerCase();
    if (lowerName.includes('walletconnect')) return '🔗';
    if (lowerName.includes('coinbase')) return '🔵';
    if (lowerName.includes('metamask')) return '🦊';
    if (lowerName.includes('injected')) return '💉';
    return '👛';
  };

  const getConnectorLabel = (name: string) => {
    if (name.toLowerCase() === 'injected') return 'Browser Wallet';
    return name;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => setShowConnectModal(false)}
      />
      
      {/* Modal */}
      <div className="relative bg-paper border border-ink/20 shadow-2xl max-w-sm w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-ink/10">
          <div className="flex items-center gap-2">
            <Wallet className="w-5 h-5" />
            <h2 className="font-mono text-sm font-medium tracking-wider">CONNECT_WALLET</h2>
          </div>
          <button
            onClick={() => setShowConnectModal(false)}
            className="p-1 text-neutral-400 hover:text-ink transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Connectors */}
        <div className="p-4 space-y-2">
          {connectors.map((connector) => (
            <button
              key={connector.uid}
              onClick={() => connectWith(connector)}
              disabled={isConnecting}
              className="w-full flex items-center gap-3 p-4 bg-white border border-ink/10 hover:border-ink/30 hover:bg-ink/5 transition-all disabled:opacity-50 disabled:cursor-wait"
            >
              <span className="text-2xl">{getConnectorIcon(connector.name)}</span>
              <div className="flex-1 text-left">
                <div className="font-mono text-sm font-medium">
                  {getConnectorLabel(connector.name)}
                </div>
                {connector.name.toLowerCase().includes('walletconnect') && (
                  <div className="text-xs text-neutral-500">
                    Scan QR code or deep link
                  </div>
                )}
              </div>
              {isConnecting && (
                <div className="w-4 h-4 border-2 border-ink/20 border-t-ink rounded-full animate-spin" />
              )}
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-ink/10 bg-ink/5">
          <p className="text-xs text-neutral-500 text-center font-mono">
            New to wallets?{' '}
            <a 
              href="https://ethereum.org/en/wallets/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              Learn more
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
