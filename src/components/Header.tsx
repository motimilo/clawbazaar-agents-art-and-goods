import { useState } from 'react';
import { Menu, X, Wallet } from 'lucide-react';
import { useWallet } from '../contexts/WalletContext';
import { TokenBalance } from './TokenBalance';

interface HeaderProps {
  currentPage: 'home' | 'marketplace' | 'agents' | 'docs' | 'join';
  onNavigate: (page: 'home' | 'marketplace' | 'agents' | 'docs' | 'join') => void;
  onOpenProfile: () => void;
}

export function Header({ currentPage, onNavigate, onOpenProfile }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { address, isConnected, connect, disconnect } = useWallet();

  const navItems = [
    { id: 'home' as const, label: 'HOME' },
    { id: 'marketplace' as const, label: 'MARKETPLACE' },
    { id: 'agents' as const, label: 'AGENTS' },
    { id: 'join' as const, label: 'JOIN' },
    { id: 'docs' as const, label: 'DOCS' },
  ];

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <header className="sticky top-0 z-40 bg-paper/95 backdrop-blur-sm border-b border-ink/10">
      <div className="h-1 flex">
        <div className="flex-1 bg-teal-500" />
        <div className="flex-1 bg-lime-400" />
        <div className="flex-1 bg-yellow-400" />
        <div className="flex-1 bg-orange-400" />
        <div className="flex-1 bg-red-400" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-24">
          <div className="flex items-center gap-4">
            <button
              onClick={() => onNavigate('home')}
              className="flex items-center gap-3 group"
            >
              <img
                src="/untitled_design_(49).png"
                alt="ClawBazaar"
                className="h-28 w-auto object-contain"
              />
            </button>

            <div className="hidden lg:block w-px h-8 bg-ink/10" />

            <nav className="hidden lg:flex items-center gap-1">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={`px-4 py-2 font-mono text-xs font-medium tracking-wider transition-colors ${
                    currentPage === item.id
                      ? 'text-ink'
                      : 'text-neutral-500 hover:text-ink hover:bg-ink/5'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="hidden md:flex items-center gap-3">
            <div className="hidden lg:flex items-center gap-2 text-xs font-mono text-neutral-500">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              SYSTEM_ONLINE
            </div>

            {isConnected && address ? (
              <div className="flex items-center gap-2">
                <TokenBalance />
                <button
                  onClick={onOpenProfile}
                  className="flex items-center gap-2 px-3 py-2 bg-white border border-ink/10 text-sm font-mono text-ink hover:border-ink/30 transition-colors"
                >
                  <span className="w-2 h-2 bg-emerald-500 rounded-full" />
                  {formatAddress(address)}
                </button>
                <button
                  onClick={disconnect}
                  className="p-2 text-neutral-400 hover:text-ink transition-colors"
                  title="Disconnect wallet"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={connect}
                className="flex items-center gap-2 px-4 py-2 bg-ink text-paper font-mono text-xs font-medium tracking-wider hover:bg-neutral-800 transition-colors"
              >
                <Wallet className="w-4 h-4" />
                CONNECT_ID
              </button>
            )}
          </div>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 text-ink"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="lg:hidden py-4 border-t border-ink/10">
            <nav className="flex flex-col gap-1 mb-4">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    onNavigate(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`px-4 py-3 font-mono text-xs font-medium tracking-wider text-left transition-colors ${
                    currentPage === item.id
                      ? 'text-ink bg-ink/5'
                      : 'text-neutral-500 hover:text-ink hover:bg-ink/5'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </nav>
            {isConnected && address ? (
              <div className="flex flex-col gap-2">
                <TokenBalance />
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => {
                      onOpenProfile();
                      setMobileMenuOpen(false);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-ink/10 text-sm font-mono text-ink"
                  >
                    <span className="w-2 h-2 bg-emerald-500 rounded-full" />
                    {formatAddress(address)}
                  </button>
                  <button
                    onClick={disconnect}
                    className="px-4 py-2 text-neutral-500 hover:text-ink transition-colors font-mono text-xs"
                  >
                    DISCONNECT
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => {
                  connect();
                  setMobileMenuOpen(false);
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-ink text-paper font-mono text-xs font-medium tracking-wider hover:bg-neutral-800 transition-colors"
              >
                <Wallet className="w-4 h-4" />
                CONNECT_ID
              </button>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
