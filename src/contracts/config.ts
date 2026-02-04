import { base, baseSepolia } from "wagmi/chains";

type ContractAddresses = {
  nft: `0x${string}`;
  token: `0x${string}`;
  editions: `0x${string}`;
};

const DEFAULT_CONTRACTS: Record<number, ContractAddresses> = {
  [base.id]: {
    nft: "0x345590cF5B3E7014B5c34079e7775F99DE3B4642",
    token: "0xda15854df692c0c4415315909e69d44e54f76b07",
    editions: "0x20380549d6348f456e8718b6D83b48d0FB06B29a",
  },
  [baseSepolia.id]: {
    // v2 contracts (production-ready with OpenZeppelin best practices)
    nft: "0x1860aD731cc597cE451e26b42ED2A42F56ab8a24",
    token: "0x073c46Fec3516532EBD59a163E4FE7a04f2f1D4A",
    editions: "0x02c734295a7F04c58E3F12B28a82c3db037543E8",
    // Legacy v1 (deprecated)
    // nft: '0x8958b179b3f942f34F6A1945Fbc7f0B387FD8edA',
    // token: '0x9E109Db8d920117A55f0d6a038E8CdBbaBC3459C',
  },
};

const envBase = {
  nft:
    import.meta.env.VITE_NFT_CONTRACT_ADDRESS_BASE ||
    import.meta.env.VITE_NFT_CONTRACT_ADDRESS,
  token:
    import.meta.env.VITE_BAZAAR_TOKEN_ADDRESS_BASE ||
    import.meta.env.VITE_BAZAAR_TOKEN_ADDRESS,
  editions:
    import.meta.env.VITE_EDITIONS_CONTRACT_ADDRESS_BASE ||
    import.meta.env.VITE_EDITIONS_CONTRACT_ADDRESS,
};

const envSepolia = {
  nft:
    import.meta.env.VITE_NFT_CONTRACT_ADDRESS_SEPOLIA ||
    import.meta.env.VITE_NFT_CONTRACT_ADDRESS,
  token:
    import.meta.env.VITE_BAZAAR_TOKEN_ADDRESS_SEPOLIA ||
    import.meta.env.VITE_BAZAAR_TOKEN_ADDRESS,
  editions:
    import.meta.env.VITE_EDITIONS_CONTRACT_ADDRESS_SEPOLIA ||
    import.meta.env.VITE_EDITIONS_CONTRACT_ADDRESS,
};

export const CONTRACTS: Record<number, ContractAddresses> = {
  [base.id]: {
    nft: (envBase.nft || DEFAULT_CONTRACTS[base.id].nft) as `0x${string}`,
    token: (envBase.token || DEFAULT_CONTRACTS[base.id].token) as `0x${string}`,
    editions: (envBase.editions ||
      DEFAULT_CONTRACTS[base.id].editions) as `0x${string}`,
  },
  [baseSepolia.id]: {
    nft: (envSepolia.nft ||
      DEFAULT_CONTRACTS[baseSepolia.id].nft) as `0x${string}`,
    token: (envSepolia.token ||
      DEFAULT_CONTRACTS[baseSepolia.id].token) as `0x${string}`,
    editions: (envSepolia.editions ||
      DEFAULT_CONTRACTS[baseSepolia.id].editions) as `0x${string}`,
  },
};

const chainEnv = (import.meta.env.VITE_CHAIN || "").toLowerCase();
const defaultChainId =
  chainEnv === "base-sepolia"
    ? baseSepolia.id
    : chainEnv === "base"
    ? base.id
    : import.meta.env.DEV
    ? baseSepolia.id
    : base.id;

export const SUPPORTED_CHAIN_ID = defaultChainId;

export const BASESCAN_URL = {
  [base.id]: "https://basescan.org",
  [baseSepolia.id]: "https://sepolia.basescan.org",
} as const;

export function getContractAddresses(chainId: number) {
  if (chainId === base.id || chainId === baseSepolia.id) {
    return CONTRACTS[chainId];
  }
  return CONTRACTS[SUPPORTED_CHAIN_ID];
}

export function getBasescanUrl(chainId: number) {
  if (chainId === base.id || chainId === baseSepolia.id) {
    return BASESCAN_URL[chainId];
  }
  return BASESCAN_URL[SUPPORTED_CHAIN_ID];
}

export function getTxUrl(chainId: number, txHash: string) {
  return `${getBasescanUrl(chainId)}/tx/${txHash}`;
}

export function getTokenUrl(chainId: number, tokenId: number | string) {
  const addresses = getContractAddresses(chainId);
  return `${getBasescanUrl(chainId)}/token/${addresses.nft}?a=${tokenId}`;
}

export function getAddressUrl(chainId: number, address: string) {
  return `${getBasescanUrl(chainId)}/address/${address}`;
}
