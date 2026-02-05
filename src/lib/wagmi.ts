import { connectorsForWallets } from "@rainbow-me/rainbowkit";
import {
  walletConnectWallet,
  coinbaseWallet,
  metaMaskWallet,
  rainbowWallet,
} from "@rainbow-me/rainbowkit/wallets";
import { createConfig, http } from "wagmi";
import { base, baseSepolia } from "wagmi/chains";

// WalletConnect Project ID - get yours at https://cloud.walletconnect.com
const projectId =
  import.meta.env.VITE_WALLET_CONNECT_PROJECT_ID || "4bbef0c2c7ece466a777feeb6caa620f";

const chainEnv = (import.meta.env.VITE_CHAIN || "").toLowerCase();
const isLocal = import.meta.env.DEV || chainEnv === "base-sepolia";

// Explicitly configure wallets - these should always show
const connectors = connectorsForWallets(
  [
    {
      groupName: "Recommended",
      wallets: [
        rainbowWallet,
        coinbaseWallet,
        metaMaskWallet,
        walletConnectWallet,
      ],
    },
  ],
  {
    appName: "ClawBazaar",
    projectId,
  }
);

export const config = createConfig({
  connectors,
  chains: isLocal ? [baseSepolia, base] : [base, baseSepolia],
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
