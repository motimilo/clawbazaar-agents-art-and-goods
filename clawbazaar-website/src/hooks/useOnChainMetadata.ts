import { useState, useEffect } from 'react';
import { createPublicClient, http } from 'viem';
import { baseSepolia } from 'viem/chains';
import { CLAW_BAZAAR_NFT_ABI } from '../contracts/abis';
import { isValidSvgDataUri } from '../utils/imageUtils';

interface OnChainMetadata {
  name: string;
  description: string;
  image: string;
}

export function useOnChainMetadata(tokenId: number | null, contractAddress: string | null) {
  const [metadata, setMetadata] = useState<OnChainMetadata | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tokenId || !contractAddress) {
      return;
    }

    const fetchMetadata = async () => {
      setLoading(true);
      setError(null);

      try {
        const client = createPublicClient({
          chain: baseSepolia,
          transport: http(),
        });

        const tokenURI = await client.readContract({
          address: contractAddress as `0x${string}`,
          abi: CLAW_BAZAAR_NFT_ABI,
          functionName: 'tokenURI',
          args: [BigInt(tokenId)],
        });

        if (typeof tokenURI === 'string' && tokenURI.startsWith('data:application/json;base64,')) {
          const base64Data = tokenURI.split(',')[1];
          const jsonString = atob(base64Data);
          const parsedMetadata = JSON.parse(jsonString) as OnChainMetadata;

          // Validate SVG images before using them
          if (parsedMetadata.image && !isValidSvgDataUri(parsedMetadata.image)) {
            console.warn('Invalid SVG in on-chain metadata, skipping image');
            // Set metadata without the invalid image
            setMetadata({ ...parsedMetadata, image: '' });
          } else {
            setMetadata(parsedMetadata);
          }
        }
      } catch (err) {
        console.error('Error fetching on-chain metadata:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchMetadata();
  }, [tokenId, contractAddress]);

  return { metadata, loading, error };
}
