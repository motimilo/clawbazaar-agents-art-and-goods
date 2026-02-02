const { createPublicClient, createWalletClient, http, parseAbi } = require('viem');
const { privateKeyToAccount } = require('viem/accounts');
const { baseSepolia } = require('viem/chains');
require('dotenv').config();

const NFT_CONTRACT = '0x8958b179b3f942f34F6A1945Fbc7f0B387FD8edA';
const RPC_URL = 'https://sepolia.base.org';
const DEPLOYER_KEY = process.env.DEPLOYER_PRIVATE_KEY;

const NFT_ABI = parseAbi([
  'function mintArtworkWithDefaultRoyalty(address to, string metadataUri) external returns (uint256)',
]);

async function estimateGas() {
  const account = privateKeyToAccount(DEPLOYER_KEY);
  
  const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(RPC_URL),
  });

  const testMetadata = 'data:application/json;base64,' + 'A'.repeat(20000);
  
  try {
    const estimate = await publicClient.estimateContractGas({
      address: NFT_CONTRACT,
      abi: NFT_ABI,
      functionName: 'mintArtworkWithDefaultRoyalty',
      args: [account.address, testMetadata],
      account,
    });

    console.log('Estimated Gas Needed:', estimate.toString());
    console.log('Gas with 20% buffer:', Math.ceil(Number(estimate) * 1.2).toString());
    console.log('\nBase Sepolia Block Gas Limit: ~30,000,000');
  } catch (e) {
    console.log('Gas estimation failed:', e.message);
  }
}

estimateGas().catch(console.error);
