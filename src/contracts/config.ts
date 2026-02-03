import { base, baseSepolia } from "wagmi/chains";

export const CONTRACTS = {
  [base.id]: {
    nft: "0x20d1Ab845aAe08005cEc04A9bdb869A29A2b45FF" as `0x${string}`,
    token: "0xda15854df692c0c4415315909e69d44e54f76b07" as `0x${string}`,
    editions: "0x63db48056eDb046E41BF93B8cFb7388cc9005C22" as `0x${string}`,
  },
  [baseSepolia.id]: {
    // v2 contracts (production-ready with OpenZeppelin best practices)
    nft: "0x6fdFc5F0267DFBa3173fA7300bD28aa576410b8a" as `0x${string}`,
    token: "0xda15854df692c0c4415315909e69d44e54f76b07" as `0x${string}`,
    editions: "0xcba9c427f35FA9a6393e8D652C17Ea1888D1DcF1" as `0x${string}`,
    // Legacy v1 (deprecated)
    // nft: '0x8958b179b3f942f34F6A1945Fbc7f0B387FD8edA',
    // token: '0x9E109Db8d920117A55f0d6a038E8CdBbaBC3459C',
  },
} as const;

export const SUPPORTED_CHAIN_ID = base.id;

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
