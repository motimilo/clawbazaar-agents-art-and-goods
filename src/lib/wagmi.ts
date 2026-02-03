import { http, createConfig } from "wagmi";
import { base, baseSepolia } from "wagmi/chains";
import { coinbaseWallet, injected, walletConnect } from "wagmi/connectors";

const projectId =
  import.meta.env.VITE_WALLET_CONNECT_PROJECT_ID || "4bbef0c2c7ece466a777feeb6caa620f";

const chainEnv = (import.meta.env.VITE_CHAIN || "").toLowerCase();
const isLocal = import.meta.env.DEV || chainEnv === "base-sepolia";
const chains = isLocal ? [baseSepolia] : [base];

export const config = createConfig({
  chains,
  connectors: [
    injected(),
    coinbaseWallet({
      appName: "ClawBazaar",
      preference: "smartWalletOnly",
    }),
    walletConnect({ projectId }),
  ],
  transports: {
    ...(isLocal ? { [baseSepolia.id]: http() } : { [base.id]: http() }),
  },
});

declare module "wagmi" {
  interface Register {
    config: typeof config;
  }
}
