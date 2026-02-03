import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useChainId } from 'wagmi';
import { parseUnits } from 'viem';
import { CLAW_BAZAAR_NFT_ABI, BZAAR_TOKEN_ABI } from '../contracts/abis';
import { getContractAddresses, SUPPORTED_CHAIN_ID } from '../contracts/config';

export function useNFTContract() {
  const chainId = useChainId();
  const contracts = getContractAddresses(chainId || SUPPORTED_CHAIN_ID);

  const { data: totalSupply } = useReadContract({
    address: contracts.nft,
    abi: CLAW_BAZAAR_NFT_ABI,
    functionName: 'totalSupply',
  });

  return {
    totalSupply: totalSupply ? Number(totalSupply) : 0,
    contractAddress: contracts.nft,
    tokenAddress: contracts.token,
  };
}

export function useNFTOwner(tokenId: number | null) {
  const chainId = useChainId();
  const contracts = getContractAddresses(chainId || SUPPORTED_CHAIN_ID);

  const { data: owner, refetch } = useReadContract({
    address: contracts.nft,
    abi: CLAW_BAZAAR_NFT_ABI,
    functionName: 'ownerOf',
    args: tokenId !== null ? [BigInt(tokenId)] : undefined,
    query: {
      enabled: tokenId !== null,
    },
  });

  return {
    owner: owner as string | undefined,
    refetch,
  };
}

export function useNFTListing(tokenId: number | null) {
  const chainId = useChainId();
  const contracts = getContractAddresses(chainId || SUPPORTED_CHAIN_ID);

  const { data, refetch } = useReadContract({
    address: contracts.nft,
    abi: CLAW_BAZAAR_NFT_ABI,
    functionName: 'getListing',
    args: tokenId !== null ? [BigInt(tokenId)] : undefined,
    query: {
      enabled: tokenId !== null,
    },
  });

  const listing = data as [string, bigint, boolean] | undefined;

  return {
    seller: listing?.[0],
    price: listing ? Number(listing[1]) : 0,
    isActive: listing?.[2] ?? false,
    refetch,
  };
}

export function useTokenAllowance(ownerAddress: string | undefined, spenderAddress: string) {
  const chainId = useChainId();
  const contracts = getContractAddresses(chainId || SUPPORTED_CHAIN_ID);

  const { data: allowance, refetch } = useReadContract({
    address: contracts.token,
    abi: BZAAR_TOKEN_ABI,
    functionName: 'allowance',
    args: ownerAddress ? [ownerAddress as `0x${string}`, spenderAddress as `0x${string}`] : undefined,
    query: {
      enabled: !!ownerAddress,
    },
  });

  return {
    allowance: allowance ? Number(allowance) : 0,
    refetch,
  };
}

export function useApproveToken() {
  const chainId = useChainId();
  const contracts = getContractAddresses(chainId || SUPPORTED_CHAIN_ID);

  const { writeContract, data: hash, isPending, error } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  function approve(amount: bigint) {
    try {
      writeContract({
        address: contracts.token,
        abi: BZAAR_TOKEN_ABI,
        functionName: 'approve',
        args: [contracts.nft, amount],
        gas: BigInt(100000),
      });
    } catch (err) {
      console.error('Approval failed:', err);
      throw err;
    }
  }

  return {
    approve,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  };
}

export function useBuyNFT() {
  const chainId = useChainId();
  const contracts = getContractAddresses(chainId || SUPPORTED_CHAIN_ID);

  const { writeContract, data: hash, isPending, error, reset } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  function buyArtwork(tokenId: number) {
    writeContract({
      address: contracts.nft,
      abi: CLAW_BAZAAR_NFT_ABI,
      functionName: 'buyArtwork',
      args: [BigInt(tokenId)],
    });
  }

  return {
    buyArtwork,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
    reset,
  };
}

export function useListNFT() {
  const chainId = useChainId();
  const contracts = getContractAddresses(chainId || SUPPORTED_CHAIN_ID);

  const { writeContract, data: hash, isPending, error } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  function listForSale(tokenId: number, priceInBzaar: number) {
    const priceWei = parseUnits(priceInBzaar.toString(), 18);
    writeContract({
      address: contracts.nft,
      abi: CLAW_BAZAAR_NFT_ABI,
      functionName: 'listForSale',
      args: [BigInt(tokenId), priceWei],
    });
  }

  return {
    listForSale,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  };
}

export function useCancelListing() {
  const chainId = useChainId();
  const contracts = getContractAddresses(chainId || SUPPORTED_CHAIN_ID);

  const { writeContract, data: hash, isPending, error } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  function cancelListing(tokenId: number) {
    writeContract({
      address: contracts.nft,
      abi: CLAW_BAZAAR_NFT_ABI,
      functionName: 'cancelListing',
      args: [BigInt(tokenId)],
    });
  }

  return {
    cancelListing,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  };
}

export function useApproveNFT() {
  const chainId = useChainId();
  const contracts = getContractAddresses(chainId || SUPPORTED_CHAIN_ID);

  const { writeContract, data: hash, isPending, error } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  function approveForMarketplace(tokenId: number) {
    writeContract({
      address: contracts.nft,
      abi: CLAW_BAZAAR_NFT_ABI,
      functionName: 'approve',
      args: [contracts.nft, BigInt(tokenId)],
    });
  }

  function setApprovalForAll(approved: boolean) {
    writeContract({
      address: contracts.nft,
      abi: CLAW_BAZAAR_NFT_ABI,
      functionName: 'setApprovalForAll',
      args: [contracts.nft, approved],
    });
  }

  return {
    approveForMarketplace,
    setApprovalForAll,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  };
}
