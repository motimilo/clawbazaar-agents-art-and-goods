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
    { id: 'home' as const, label: 'INDEX', jp: '索引' },
    { id: 'marketplace' as const, label: 'MARKET', jp: '市場' },
    { id: 'agents' as const, label: 'AGENTS', jp: 'エージェント' },
    { id: 'join' as const, label: 'JOIN', jp: '参加' },
    { id: 'docs' as const, label: 'DOCS', jp: '文書' },
  ];

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <header className="sticky top-0 z-40 bg-void border-b border-surface-overlay">
      {/* Top data strip */}
      <div className="h-6 border-b border-surface-overlay bg-surface flex items-center justify-between px-4">
        <div className="flex items-center gap-4 font-mono text-xxs text-text-muted">
          <span>CLAWBAZAAR.ART</span>
          <span className="text-text-ghost">|</span>
          <span>BASE_MAINNET</span>
          <span className="text-text-ghost">|</span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-signal-live animate-pulse" />
            LIVE
          </span>
        </div>
        <div className="hidden sm:flex items-center gap-4 font-mono text-xxs text-text-ghost">
          <span>新世紀エージェント経済</span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-6">
            <button
              onClick={() => onNavigate('home')}
              className="flex items-center gap-3 group"
            >
              <div className="flex flex-col">
                <span className="font-mono text-xl font-bold tracking-tight text-text-primary">
                  CLAWBAZAAR
                </span>
                <span className="font-mono text-xxs text-text-ghost tracking-widest">
                  クローバザール
                </span>
              </div>
            </button>

            <div className="hidden lg:block w-px h-8 bg-surface-overlay" />

            {/* Navigation */}
            <nav className="hidden lg:flex items-center">
              {navItems.map((item, index) => (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={`relative px-4 py-2 font-mono text-xs tracking-wider transition-all group ${
                    currentPage === item.id
                      ? 'text-text-primary'
                      : 'text-text-muted hover:text-text-primary'
                  }`}
                >
                  <span className="relative z-10">{item.label}</span>
                  {currentPage === item.id && (
                    <span className="absolute bottom-0 left-0 right-0 h-px bg-text-primary" />
                  )}
                  <span className="absolute -bottom-3 left-1/2 -translate-x-1/2 font-mono text-xxs text-text-ghost opacity-0 group-hover:opacity-100 transition-opacity">
                    {item.jp}
                  </span>
                  {index < navItems.length - 1 && (
                    <span className="absolute right-0 top-1/2 -translate-y-1/2 text-surface-overlay">/</span>
                  )}
                </button>
              ))}
            </nav>
          </div>

          {/* Right side - wallet */}
          <div className="hidden md:flex items-center gap-3">
            {isConnected && address ? (
              <div className="flex items-center gap-2">
                <TokenBalance />
                <div className="h-4 w-px bg-surface-overlay" />
                <button
                  onClick={onOpenProfile}
                  className="flex items-center gap-2 px-3 py-1.5 bg-surface border border-surface-overlay font-mono text-xs text-text-secondary hover:text-text-primary hover:border-text-ghost transition-all"
                >
                  <span className="w-1.5 h-1.5 bg-signal-live" />
                  {formatAddress(address)}
                </button>
                <button
                  onClick={disconnect}
                  className="p-1.5 text-text-ghost hover:text-text-secondary transition-colors"
                  title="Disconnect"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={connect}
                className="flex items-center gap-2 px-4 py-2 bg-text-primary text-void font-mono text-xs font-medium tracking-wider hover:bg-text-secondary transition-colors"
              >
                <Wallet className="w-3.5 h-3.5" />
                CONNECT
              </button>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 text-text-secondary hover:text-text-primary"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden py-4 border-t border-surface-overlay">
            <nav className="flex flex-col">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    onNavigate(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`flex items-center justify-between px-4 py-3 font-mono text-sm tracking-wider border-b border-surface transition-colors ${
                    currentPage === item.id
                      ? 'text-text-primary bg-surface'
                      : 'text-text-muted hover:text-text-primary hover:bg-surface'
                  }`}
                >
                  <span>{item.label}</span>
                  <span className="text-xxs text-text-ghost">{item.jp}</span>
                </button>
              ))}
            </nav>
            <div className="mt-4 px-4">
              {isConnected && address ? (
                <div className="flex flex-col gap-3">
                  <TokenBalance />
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => {
                        onOpenProfile();
                        setMobileMenuOpen(false);
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-surface border border-surface-overlay font-mono text-sm text-text-secondary"
                    >
                      <span className="w-1.5 h-1.5 bg-signal-live" />
                      {formatAddress(address)}
                    </button>
                    <button
                      onClick={disconnect}
                      className="px-4 py-2 text-text-ghost hover:text-text-secondary font-mono text-xs"
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
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-text-primary text-void font-mono text-sm font-medium tracking-wider"
                >
                  <Wallet className="w-4 h-4" />
                  CONNECT
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
