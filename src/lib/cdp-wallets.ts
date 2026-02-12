/**
 * CDP Agentic Wallets Integration for CLAWBAZAAR
 * 
 * Uses Coinbase Developer Platform Server Wallet v2 for:
 * - Gasless agent transactions
 * - Secure key management (TEE)
 * - Smart account features (batching, spend limits)
 */

import { CdpClient } from "@coinbase/cdp-sdk";

// Singleton CDP client
let cdpClient: CdpClient | null = null;

/**
 * Get or create CDP client instance
 */
export function getCdpClient(): CdpClient {
  if (!cdpClient) {
    cdpClient = new CdpClient();
  }
  return cdpClient;
}

/**
 * Create a new agent wallet using CDP
 * Returns the wallet address (keys are secured by CDP)
 */
export async function createAgentWallet(): Promise<{
  address: string;
  network: string;
}> {
  const cdp = getCdpClient();
  const account = await cdp.evm.createAccount();
  
  return {
    address: account.address,
    network: "base", // Works across all EVM chains
  };
}

/**
 * Send a gasless transaction from an agent wallet
 * CDP handles gas sponsorship on Base
 */
export async function sendAgentTransaction({
  address,
  to,
  data,
  value = "0",
  network = "base",
}: {
  address: string;
  to: string;
  data?: string;
  value?: string;
  network?: string;
}): Promise<{ transactionHash: string }> {
  const cdp = getCdpClient();
  
  const result = await cdp.evm.sendTransaction({
    address,
    transaction: {
      to,
      data,
      value: BigInt(value),
    },
    network,
  });
  
  return {
    transactionHash: result.transactionHash,
  };
}

/**
 * Request testnet funds for an agent wallet (for testing)
 */
export async function requestTestnetFunds(address: string): Promise<{
  transactionHash: string;
}> {
  const cdp = getCdpClient();
  
  const result = await cdp.evm.requestFaucet({
    address,
    network: "base-sepolia",
    token: "eth",
  });
  
  return {
    transactionHash: result.transactionHash,
  };
}

/**
 * Mint an edition using CDP wallet (gasless)
 * Encodes the mint call and sends via CDP
 */
export async function mintEditionGasless({
  agentAddress,
  editionId,
  quantity = 1,
  editionsContract,
}: {
  agentAddress: string;
  editionId: number;
  quantity?: number;
  editionsContract: string;
}): Promise<{ transactionHash: string }> {
  // Encode mint function call
  // mint(uint256 editionId, uint256 quantity)
  const mintSelector = "0x94bf804d"; // keccak256("mint(uint256,uint256)")[:4]
  const editionIdHex = editionId.toString(16).padStart(64, "0");
  const quantityHex = quantity.toString(16).padStart(64, "0");
  const data = `${mintSelector}${editionIdHex}${quantityHex}`;
  
  return sendAgentTransaction({
    address: agentAddress,
    to: editionsContract,
    data,
    network: "base",
  });
}

/**
 * Check if CDP is configured
 */
export function isCdpConfigured(): boolean {
  return !!(
    process.env.CDP_API_KEY_ID &&
    process.env.CDP_API_KEY_SECRET &&
    process.env.CDP_WALLET_SECRET
  );
}

/**
 * Get configuration status for debugging
 */
export function getCdpConfigStatus(): {
  configured: boolean;
  hasApiKeyId: boolean;
  hasApiKeySecret: boolean;
  hasWalletSecret: boolean;
} {
  return {
    configured: isCdpConfigured(),
    hasApiKeyId: !!process.env.CDP_API_KEY_ID,
    hasApiKeySecret: !!process.env.CDP_API_KEY_SECRET,
    hasWalletSecret: !!process.env.CDP_WALLET_SECRET,
  };
}
