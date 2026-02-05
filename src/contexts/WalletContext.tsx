import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useAccount, useDisconnect, useBalance, useChainId, useSwitchChain, useConnect, Connector } from 'wagmi';
import { base, baseSepolia } from 'wagmi/chains';
import { supabase } from '../lib/supabase';
import { getContractAddresses, SUPPORTED_CHAIN_ID } from '../contracts/config';
import { formatUnits } from 'viem';

interface WalletContextType {
  address: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  balance: number;
  chainId: number | undefined;
  isCorrectNetwork: boolean;
  targetChainId: number;
  targetChainName: string;
  connect: () => void;
  disconnect: () => void;
  switchToBase: () => Promise<void>;
  refreshBalance: () => void;
  connectors: readonly Connector[];
  connectWith: (connector: Connector) => void;
  showConnectModal: boolean;
  setShowConnectModal: (show: boolean) => void;
}

const WalletContext = createContext<WalletContextType | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const { address, isConnected, isConnecting: wagmiConnecting } = useAccount();
  const { connectors, connect: wagmiConnect, isPending } = useConnect();
  const { disconnect: wagmiDisconnect } = useDisconnect();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const [showConnectModal, setShowConnectModal] = useState(false);

  const contracts = getContractAddresses(chainId || SUPPORTED_CHAIN_ID);

  const { data: tokenBalance, refetch: refetchBalance } = useBalance({
    address: address as `0x${string}` | undefined,
    token: contracts.token !== '0x0000000000000000000000000000000000000000'
      ? contracts.token
      : undefined,
  });

  const targetChainId = SUPPORTED_CHAIN_ID;
  const targetChainName = targetChainId === baseSepolia.id ? 'Base Sepolia' : 'Base';
  const isCorrectNetwork = chainId === targetChainId;

  useEffect(() => {
    if (address && isConnected) {
      ensureUserExists(address);
      setShowConnectModal(false);
    }
  }, [address, isConnected]);

  async function ensureUserExists(walletAddress: string) {
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('wallet_address', walletAddress.toLowerCase())
      .maybeSingle();

    if (!existingUser) {
      await supabase.from('users').insert({
        wallet_address: walletAddress.toLowerCase(),
      });
    }
  }

  function connect() {
    setShowConnectModal(true);
  }

  function connectWith(connector: Connector) {
    wagmiConnect({ connector });
  }

  function disconnect() {
    wagmiDisconnect();
  }

  async function switchToBase() {
    if (switchChain) {
      switchChain({ chainId: targetChainId });
    }
  }

  function refreshBalance() {
    refetchBalance();
  }

  const balance = tokenBalance
    ? Number(formatUnits(tokenBalance.value, tokenBalance.decimals))
    : 0;

  return (
    <WalletContext.Provider
      value={{
        address: address || null,
        isConnected,
        isConnecting: wagmiConnecting || isPending,
        balance,
        chainId,
        isCorrectNetwork,
        targetChainId,
        targetChainName,
        connect,
        disconnect,
        switchToBase,
        refreshBalance,
        connectors,
        connectWith,
        showConnectModal,
        setShowConnectModal,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}
