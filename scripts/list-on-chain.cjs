const { createWalletClient, createPublicClient, http, parseUnits } = require('viem');
const { privateKeyToAccount } = require('viem/accounts');
const { base } = require('viem/chains');

const NFT_CONTRACT = '0x345590cF5B3E7014B5c34079e7775F99DE3B4642';
const NFT_ABI = [
  {
    type: 'function',
    name: 'setApprovalForAll',
    inputs: [
      { name: 'operator', type: 'address' },
      { name: 'approved', type: 'bool' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'isApprovedForAll',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'operator', type: 'address' },
    ],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'listForSale',
    inputs: [
      { name: 'tokenId', type: 'uint256' },
      { name: 'price', type: 'uint256' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'getListing',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [
      { name: 'seller', type: 'address' },
      { name: 'price', type: 'uint256' },
      { name: 'active', type: 'bool' },
    ],
    stateMutability: 'view',
  }
];

async function main() {
  const privateKey = process.env.CLAWBAZAAR_PRIVATE_KEY;
  if (!privateKey) {
    console.error('Missing CLAWBAZAAR_PRIVATE_KEY');
    process.exit(1);
  }

  const account = privateKeyToAccount(privateKey);
  console.log('Wallet:', account.address);
  
  const client = createWalletClient({
    account,
    chain: base,
    transport: http('https://mainnet.base.org'),
  });
  
  const publicClient = createPublicClient({
    chain: base,
    transport: http('https://mainnet.base.org'),
  });

  // Step 1: Check if contract is approved
  const isApproved = await publicClient.readContract({
    address: NFT_CONTRACT,
    abi: NFT_ABI,
    functionName: 'isApprovedForAll',
    args: [account.address, NFT_CONTRACT],
  });
  
  console.log('Contract approved:', isApproved);
  
  if (!isApproved) {
    console.log('Approving contract for all tokens...');
    const approveHash = await client.writeContract({
      address: NFT_CONTRACT,
      abi: NFT_ABI,
      functionName: 'setApprovalForAll',
      args: [NFT_CONTRACT, true],
    });
    console.log('Approval TX:', approveHash);
    
    // Wait for confirmation
    console.log('Waiting for confirmation...');
    await publicClient.waitForTransactionReceipt({ hash: approveHash });
    console.log('Approved!');
  }

  // Step 2: List tokens
  const price = parseUnits('500', 18);
  const tokenIds = [3, 4, 5];

  for (const tokenId of tokenIds) {
    try {
      const listing = await publicClient.readContract({
        address: NFT_CONTRACT,
        abi: NFT_ABI,
        functionName: 'getListing',
        args: [BigInt(tokenId)],
      });
      
      if (listing[2]) {
        console.log(`Token ${tokenId} already listed, skipping`);
        continue;
      }

      console.log(`Listing token ${tokenId} for 500 BAZAAR...`);
      const hash = await client.writeContract({
        address: NFT_CONTRACT,
        abi: NFT_ABI,
        functionName: 'listForSale',
        args: [BigInt(tokenId), price],
      });
      console.log(`Token ${tokenId} listed! TX: ${hash}`);
      
      await publicClient.waitForTransactionReceipt({ hash });
      console.log(`Token ${tokenId} confirmed!`);
    } catch (err) {
      console.error(`Error with token ${tokenId}:`, err.message);
    }
  }
  
  console.log('Done!');
}

main().catch(console.error);
