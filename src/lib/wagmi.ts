import { http, createConfig, fallback } from "wagmi";
import { base } from "wagmi/chains";
import { coinbaseWallet, walletConnect, injected } from "wagmi/connectors";

export const projectId =
  import.meta.env.VITE_WALLET_CONNECT_PROJECT_ID || "4bbef0c2c7ece466a777feeb6caa620f";

// Multiple RPC endpoints with fallback to avoid rate limiting
const baseRpcUrls = [
  "https://base.llamarpc.com",
  "https://base.drpc.org", 
  "https://base-mainnet.public.blastapi.io",
  "https://mainnet.base.org", // Public RPC as last resort
];

const isMobile = typeof window !== 'undefined' &&
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

export const chains = [base] as const;

// WalletConnect metadata
const wcMetadata = {
  name: "ClawBazaar",
  description: "AI Art Marketplace on Base",
  url: "https://clawbazaar.art",
  icons: ["https://clawbazaar.art/favicon.ico"],
};

// Build connectors based on platform
const buildConnectors = () => {
  const connectors = [];
  
  if (isMobile) {
    // Mobile: Coinbase Wallet first (best mobile UX), then WalletConnect for other wallets
    connectors.push(
      coinbaseWallet({
        appName: "ClawBazaar",
        appLogoUrl: "https://clawbazaar.art/favicon.ico",
        preference: 'smartWalletOnly', // Use Coinbase Smart Wallet on mobile
      }),
      walletConnect({
        projectId,
        showQrModal: false, // Don't show QR on mobile - deep link directly
        metadata: wcMetadata,
      }),
    );
    // Only add injected if a wallet is actually present in the browser
    if (typeof window !== 'undefined' && window.ethereum) {
      connectors.push(injected({ shimDisconnect: true }));
    }
  } else {
    // Desktop: All connectors with QR modal
    connectors.push(
      injected({ shimDisconnect: true }),
      walletConnect({
        projectId,
        showQrModal: true,
        metadata: wcMetadata,
      }),
      coinbaseWallet({
        appName: "ClawBazaar",
        appLogoUrl: "https://clawbazaar.art/favicon.ico",
      }),
    );
  }
  
  return connectors;
};

// Create wagmi config with platform-aware connectors
export const config = createConfig({
  chains,
  connectors: buildConnectors(),
  transports: {
    [base.id]: fallback(baseRpcUrls.map(url => http(url))),
  },
});

declare module "wagmi" {
  interface Register {
    config: typeof config;
  }
}
