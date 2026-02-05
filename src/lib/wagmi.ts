import { cookieStorage, createStorage, http } from "@wagmi/core";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { base, baseSepolia } from "@reown/appkit/networks";

// WalletConnect Project ID - get yours at https://cloud.reown.com
export const projectId =
  import.meta.env.VITE_WALLET_CONNECT_PROJECT_ID || "4bbef0c2c7ece466a777feeb6caa620f";

const chainEnv = (import.meta.env.VITE_CHAIN || "").toLowerCase();
const isLocal = import.meta.env.DEV || chainEnv === "base-sepolia";

// Set up networks
export const networks = isLocal ? [baseSepolia, base] : [base, baseSepolia];

// Create Wagmi Adapter
export const wagmiAdapter = new WagmiAdapter({
  storage: createStorage({
    storage: cookieStorage,
  }),
  ssr: false,
  projectId,
  networks,
  transports: {
    [base.id]: http("https://mainnet.base.org"),
    [baseSepolia.id]: http("https://sepolia.base.org"),
  },
});

export const config = wagmiAdapter.wagmiConfig;
