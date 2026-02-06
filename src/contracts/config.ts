import { base } from "wagmi/chains";

type ContractAddresses = {
  nft: `0x${string}`;
  token: `0x${string}`;
  editions: `0x${string}`;
};

// Base Mainnet contracts - PRODUCTION ONLY
// No more Sepolia complexity. This is the source of truth.
const MAINNET_CONTRACTS: ContractAddresses = {
  nft: "0x20d1Ab845aAe08005cEc04A9bdb869A29A2b45FF",
  token: "0xdA15854Df692c0c4415315909E69D44E54F76B07",
  editions: "0x63db48056eDb046E41BF93B8cFb7388cc9005C22",
};

export const CONTRACTS: Record<number, ContractAddresses> = {
  [base.id]: MAINNET_CONTRACTS,
};

// Always Base mainnet
export const SUPPORTED_CHAIN_ID = base.id;

export const BASESCAN_URL = "https://basescan.org";

export function getContractAddresses(_chainId?: number) {
  // Always return mainnet contracts
  return MAINNET_CONTRACTS;
}

export function getBasescanUrl(_chainId?: number) {
  return BASESCAN_URL;
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
