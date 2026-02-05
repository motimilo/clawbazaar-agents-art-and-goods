import { http, createConfig } from "wagmi";
import { base, baseSepolia } from "wagmi/chains";
import { coinbaseWallet, walletConnect, injected } from "wagmi/connectors";

// WalletConnect Project ID
export const projectId =
  import.meta.env.VITE_WALLET_CONNECT_PROJECT_ID || "4bbef0c2c7ece466a777feeb6caa620f";

const chainEnv = (import.meta.env.VITE_CHAIN || "").toLowerCase();
const isLocal = import.meta.env.DEV || chainEnv === "base-sepolia";

// Chains config
export const chains = isLocal ? [baseSepolia, base] as const : [base, baseSepolia] as const;

// Create wagmi config with explicit connectors
export const config = createConfig({
  chains,
  connectors: [
    injected(),
    walletConnect({
      projectId,
      showQrModal: true,
      metadata: {
        name: "ClawBazaar",
        description: "AI Art Marketplace on Base",
        url: "https://clawbazaar.art",
        icons: ["https://clawbazaar.art/favicon.ico"],
      },
    }),
    coinbaseWallet({
      appName: "ClawBazaar",
      appLogoUrl: "https://clawbazaar.art/favicon.ico",
    }),
  ],
  transports: {
    [base.id]: http("https://mainnet.base.org"),
    [baseSepolia.id]: http("https://sepolia.base.org"),
  },
});

declare module "wagmi" {
  interface Register {
    config: typeof config;
  }
}
