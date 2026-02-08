import { useState, useCallback } from 'react';
import { useWriteContract, useWaitForTransactionReceipt, useAccount, usePublicClient } from 'wagmi';
import { parseEther, formatEther, encodeFunctionData, type Address } from 'viem';
import { base } from 'viem/chains';

// Uniswap Universal Router on Base
const UNIVERSAL_ROUTER = '0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD' as Address;
const WETH = '0x4200000000000000000000000000000000000006' as Address;
const BAZAAR = '0xdA15854Df692c0c4415315909E69D44E54F76B07' as Address;

// DexScreener API for price quotes
const DEXSCREENER_POOL = '0x6dd542358050ef6fd9de37a88cfdeabb57ea202a33a774b3ceff8aa41ea8ea98';

interface SwapQuote {
  ethAmount: string;
  bazaarAmount: string;
  pricePerBazaar: string;
  slippageBps: number;
}

export function useSwapETHForBazaar() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [swapTxHash, setSwapTxHash] = useState<`0x${string}` | undefined>();
  
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  const { isSuccess: isSwapConfirmed, isLoading: isSwapPending } = useWaitForTransactionReceipt({
    hash: swapTxHash,
  });

  // Get quote for how much ETH needed for X BAZAAR
  const getQuote = useCallback(async (bazaarNeeded: bigint, slippageBps = 500): Promise<SwapQuote | null> => {
    try {
      // Fetch current price from DexScreener
      const response = await fetch(
        `https://api.dexscreener.com/latest/dex/pairs/base/${DEXSCREENER_POOL}`
      );
      const data = await response.json();
      const pair = data.pair || data.pairs?.[0];
      
      if (!pair) {
        throw new Error('Could not fetch price');
      }

      const priceInEth = parseFloat(pair.priceNative); // ETH per BAZAAR
      const bazaarAmount = Number(bazaarNeeded) / 1e18;
      
      // Calculate ETH needed
      const ethNeeded = bazaarAmount * priceInEth;
      
      // Add slippage
      const ethWithSlippage = ethNeeded * (1 + slippageBps / 10000);

      return {
        ethAmount: ethWithSlippage.toFixed(18),
        bazaarAmount: bazaarAmount.toString(),
        pricePerBazaar: priceInEth.toExponential(4),
        slippageBps,
      };
    } catch (err) {
      console.error('Quote error:', err);
      setError(err instanceof Error ? err.message : 'Failed to get quote');
      return null;
    }
  }, []);

  // Execute swap via Uniswap
  const executeSwap = useCallback(async (
    bazaarNeeded: bigint,
    slippageBps = 500
  ): Promise<boolean> => {
    if (!address || !publicClient) {
      setError('Wallet not connected');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      const quote = await getQuote(bazaarNeeded, slippageBps);
      if (!quote) {
        throw new Error('Could not get quote');
      }

      const ethAmount = parseEther(quote.ethAmount);
      const minBazaarOut = (bazaarNeeded * BigInt(10000 - slippageBps)) / 10000n;

      // Build Universal Router command for V4 swap
      // Command 0x10 = V4_SWAP
      // For V4, we need to encode the swap through the pool

      // Simpler approach: Use Permit2 + UniversalRouter
      // Commands: WRAP_ETH (0x0b), V4_SWAP (0x10)
      
      const commands = '0x0b10'; // WRAP_ETH + V4_SWAP
      
      // WRAP_ETH input: (address recipient, uint256 amount)
      const wrapInput = encodeFunctionData({
        abi: [{
          name: 'wrap',
          type: 'function',
          inputs: [
            { name: 'recipient', type: 'address' },
            { name: 'amount', type: 'uint256' }
          ],
          outputs: [],
          stateMutability: 'nonpayable'
        }],
        functionName: 'wrap',
        args: [UNIVERSAL_ROUTER, ethAmount]
      }).slice(10); // Remove function selector

      // For V4 swap, the encoding is complex
      // Let's use a workaround: direct swap via quoter

      // Alternative: Use the 0x API for swap
      const zeroXResponse = await fetch(
        `https://base.api.0x.org/swap/v1/quote?` +
        `buyToken=${BAZAAR}&` +
        `sellToken=ETH&` +
        `sellAmount=${ethAmount.toString()}&` +
        `slippagePercentage=${slippageBps / 10000}`,
        {
          headers: {
            '0x-api-key': 'c9f13c84-9fcb-4f42-aa30-a11b0d016aa5' // Public demo key
          }
        }
      );

      if (!zeroXResponse.ok) {
        // Fallback: Just wrap ETH and let user know they need BAZAAR
        throw new Error('Swap routing not available. Please acquire BAZAAR from Uniswap directly.');
      }

      const zeroXQuote = await zeroXResponse.json();
      
      // Execute the swap using 0x data
      const tx = await writeContractAsync({
        address: zeroXQuote.to as Address,
        abi: [{
          name: 'execute',
          type: 'function',
          inputs: [],
          outputs: [],
          stateMutability: 'payable'
        }],
        functionName: 'execute',
        value: ethAmount,
        // @ts-ignore - raw data
        data: zeroXQuote.data,
      });

      setSwapTxHash(tx);
      return true;
    } catch (err) {
      console.error('Swap error:', err);
      setError(err instanceof Error ? err.message : 'Swap failed');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [address, publicClient, getQuote, writeContractAsync]);

  return {
    getQuote,
    executeSwap,
    isLoading: isLoading || isSwapPending,
    isSwapConfirmed,
    swapTxHash,
    error,
    reset: () => {
      setSwapTxHash(undefined);
      setError(null);
    }
  };
}

// Export price fetching utility
export async function getBazaarPrice(): Promise<{ ethPerBazaar: number; usdPerBazaar: number } | null> {
  try {
    const response = await fetch(
      `https://api.dexscreener.com/latest/dex/pairs/base/${DEXSCREENER_POOL}`
    );
    const data = await response.json();
    const pair = data.pair || data.pairs?.[0];
    
    if (!pair) return null;

    return {
      ethPerBazaar: parseFloat(pair.priceNative),
      usdPerBazaar: parseFloat(pair.priceUsd),
    };
  } catch {
    return null;
  }
}
