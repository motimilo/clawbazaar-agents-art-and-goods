import { X, Wallet, Smartphone } from 'lucide-react';
import { useWallet } from '../contexts/WalletContext';
import { useMemo } from 'react';

// Mobile detection
const isMobile = typeof window !== 'undefined' && 
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

export function ConnectWalletModal() {
  const { showConnectModal, setShowConnectModal, connectors, connectWith, isConnecting } = useWallet();

  // Sort and filter connectors for better UX
  const sortedConnectors = useMemo(() => {
    return [...connectors].sort((a, b) => {
      // Coinbase first on mobile, injected first on desktop
      if (isMobile) {
        if (a.name.toLowerCase().includes('coinbase')) return -1;
        if (b.name.toLowerCase().includes('coinbase')) return 1;
      } else {
        if (a.name.toLowerCase().includes('injected') || a.name.toLowerCase().includes('metamask')) return -1;
        if (b.name.toLowerCase().includes('injected') || b.name.toLowerCase().includes('metamask')) return 1;
      }
      return 0;
    });
  }, [connectors]);

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
    const lowerName = name.toLowerCase();
    if (lowerName === 'injected') return 'Browser Wallet';
    if (lowerName.includes('coinbase')) return isMobile ? 'Coinbase Wallet' : 'Coinbase Wallet';
    return name;
  };

  const getConnectorDescription = (name: string) => {
    const lowerName = name.toLowerCase();
    if (lowerName.includes('walletconnect')) {
      return isMobile ? 'Open in wallet app' : 'Scan QR code';
    }
    if (lowerName.includes('coinbase')) {
      return isMobile ? 'Recommended for mobile' : 'Connect with Coinbase';
    }
    if (lowerName.includes('injected') || lowerName.includes('metamask')) {
      return 'Use browser extension';
    }
    return null;
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
            {isMobile ? <Smartphone className="w-5 h-5" /> : <Wallet className="w-5 h-5" />}
            <h2 className="font-mono text-sm font-medium tracking-wider">CONNECT_WALLET</h2>
          </div>
          <button
            onClick={() => setShowConnectModal(false)}
            className="p-1 text-neutral-400 hover:text-ink transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mobile tip */}
        {isMobile && (
          <div className="px-4 pt-3 pb-1">
            <p className="text-xs text-amber-600 font-mono bg-amber-50 p-2 border border-amber-200">
              📱 On mobile? Coinbase Wallet works best.
            </p>
          </div>
        )}

        {/* Connectors */}
        <div className="p-4 space-y-2">
          {sortedConnectors.map((connector) => {
            const description = getConnectorDescription(connector.name);
            const isRecommended = isMobile && connector.name.toLowerCase().includes('coinbase');
            
            return (
              <button
                key={connector.uid}
                onClick={() => connectWith(connector)}
                disabled={isConnecting}
                className={`w-full flex items-center gap-3 p-4 bg-white border transition-all disabled:opacity-50 disabled:cursor-wait ${
                  isRecommended 
                    ? 'border-blue-300 hover:border-blue-400 hover:bg-blue-50/50 ring-1 ring-blue-100' 
                    : 'border-ink/10 hover:border-ink/30 hover:bg-ink/5'
                }`}
              >
                <span className="text-2xl">{getConnectorIcon(connector.name)}</span>
                <div className="flex-1 text-left">
                  <div className="font-mono text-sm font-medium flex items-center gap-2">
                    {getConnectorLabel(connector.name)}
                    {isRecommended && (
                      <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                        RECOMMENDED
                      </span>
                    )}
                  </div>
                  {description && (
                    <div className="text-xs text-neutral-500">
                      {description}
                    </div>
                  )}
                </div>
                {isConnecting && (
                  <div className="w-4 h-4 border-2 border-ink/20 border-t-ink rounded-full animate-spin" />
                )}
              </button>
            );
          })}
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
