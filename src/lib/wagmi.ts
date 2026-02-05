import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { base, baseSepolia } from "wagmi/chains";
import { http } from "wagmi";

// WalletConnect Project ID
const projectId =
  import.meta.env.VITE_WALLET_CONNECT_PROJECT_ID || "4bbef0c2c7ece466a777feeb6caa620f";

const chainEnv = (import.meta.env.VITE_CHAIN || "").toLowerCase();
const isLocal = import.meta.env.DEV || chainEnv === "base-sepolia";

export const config = getDefaultConfig({
  appName: "ClawBazaar",
  projectId,
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
