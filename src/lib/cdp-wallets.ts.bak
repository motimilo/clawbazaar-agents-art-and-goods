/**
 * CDP Agentic Wallets Integration for CLAWBAZAAR
 * Production-ready module for gasless agent transactions on Base
 * 
 * Uses Coinbase Developer Platform Server Wallet v2:
 * - Smart Accounts (EIP-4337) for gasless transactions
 * - Secure key management (TEE)
 * - Transaction batching
 */

import { CdpClient } from "@coinbase/cdp-sdk";
import { encodeFunctionData, parseAbi } from "viem";

// Contract addresses (Base Mainnet)
export const CONTRACTS = {
  EDITIONS: "0x63db48056eDb046E41BF93B8cFb7388cc9005C22",
  NFT: "0x345590cF5B3E7014B5c34079e7775F99DE3B4642",
  BAZAAR_TOKEN: "0xdA15854Df692c0c4415315909E69D44E54F76B07",
} as const;

// ABIs
const erc20Abi = parseAbi([
  "function approve(address spender, uint256 amount) returns (bool)",
  "function transfer(address to, uint256 amount) returns (bool)",
]);

const editionsAbi = parseAbi([
  "function mint(uint256 editionId, uint256 quantity) payable",
]);

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
 * Create a new agent wallet with Smart Account (EIP-4337)
 * Smart Accounts enable gasless transactions when credits are active
 */
export async function createAgentSmartWallet(): Promise<{
  ownerAddress: string;
  smartAccountAddress: string;
  network: string;
}> {
  const cdp = getCdpClient();
  
  // Create owner EOA
  const owner = await cdp.evm.createAccount();
  
  // Create Smart Account with owner
  const smartAccount = await cdp.evm.createSmartAccount({
    owner: owner,
  });
  
  return {
    ownerAddress: owner.address,
    smartAccountAddress: smartAccount.address,
    network: "base",
  };
}

/**
 * Create a simple EOA wallet (for agents that need direct control)
 */
export async function createAgentWallet(): Promise<{
  address: string;
  network: string;
}> {
  const cdp = getCdpClient();
  const account = await cdp.evm.createAccount();
  
  return {
    address: account.address,
    network: "base",
  };
}

/**
 * Send a transaction from an agent wallet
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
 * Send a gasless user operation from a Smart Account
 * Requires gas credits to be active on mainnet
 */
export async function sendGaslessUserOp({
  ownerAddress,
  smartAccountAddress,
  calls,
  network = "base",
}: {
  ownerAddress: string;
  smartAccountAddress: string;
  calls: Array<{ to: string; value?: bigint; data?: string }>;
  network?: string;
}): Promise<{ userOpHash: string; status: string }> {
  const cdp = getCdpClient();
  
  // Recreate the owner account reference
  const owner = { address: ownerAddress };
  
  // Recreate smart account reference
  const smartAccount = {
    address: smartAccountAddress,
    owners: [owner],
  };
  
  const result = await cdp.evm.sendUserOperation({
    smartAccount,
    network,
    calls: calls.map(c => ({
      to: c.to,
      value: c.value || BigInt(0),
      data: c.data || "0x",
    })),
  });
  
  return {
    userOpHash: result.userOpHash,
    status: result.status,
  };
}

/**
 * Mint an edition using agent wallet
 */
export async function mintEdition({
  agentAddress,
  editionId,
  quantity = 1,
  priceWei = "0",
}: {
  agentAddress: string;
  editionId: number;
  quantity?: number;
  priceWei?: string;
}): Promise<{ transactionHash: string }> {
  const data = encodeFunctionData({
    abi: editionsAbi,
    functionName: "mint",
    args: [BigInt(editionId), BigInt(quantity)],
  });
  
  return sendAgentTransaction({
    address: agentAddress,
    to: CONTRACTS.EDITIONS,
    data,
    value: priceWei,
    network: "base",
  });
}

/**
 * Approve $BAZAAR spending for an agent
 */
export async function approveBazaar({
  agentAddress,
  spender,
  amount,
}: {
  agentAddress: string;
  spender: string;
  amount: bigint;
}): Promise<{ transactionHash: string }> {
  const data = encodeFunctionData({
    abi: erc20Abi,
    functionName: "approve",
    args: [spender, amount],
  });
  
  return sendAgentTransaction({
    address: agentAddress,
    to: CONTRACTS.BAZAAR_TOKEN,
    data,
    network: "base",
  });
}

/**
 * Transfer $BAZAAR from agent to recipient
 */
export async function transferBazaar({
  agentAddress,
  to,
  amount,
}: {
  agentAddress: string;
  to: string;
  amount: bigint;
}): Promise<{ transactionHash: string }> {
  const data = encodeFunctionData({
    abi: erc20Abi,
    functionName: "transfer",
    args: [to, amount],
  });
  
  return sendAgentTransaction({
    address: agentAddress,
    to: CONTRACTS.BAZAAR_TOKEN,
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
 * Get configuration status
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
