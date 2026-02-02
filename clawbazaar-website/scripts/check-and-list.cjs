const { createPublicClient, createWalletClient, http, parseAbi, parseEther } = require('viem');
const { privateKeyToAccount } = require('viem/accounts');
const { baseSepolia } = require('viem/chains');
require('dotenv').config();

const NFT_CONTRACT = '0x8958b179b3f942f34F6A1945Fbc7f0B387FD8edA';
const RPC_URL = 'https://sepolia.base.org';
const BUYER_KEY = '0x' + '1'.repeat(64);

const NFT_ABI = parseAbi([
  'function ownerOf(uint256 tokenId) external view returns (address)',
  'function approve(address to, uint256 tokenId) external',
  'function listForSale(uint256 tokenId, uint256 price) external',
  'function getListing(uint256 tokenId) external view returns (address seller, uint256 price, bool active)',
]);

async function listNFT() {
  const owner = privateKeyToAccount(BUYER_KEY);
  
  const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(RPC_URL),
  });

  const walletClient = createWalletClient({
    account: owner,
    chain: baseSepolia,
    transport: http(RPC_URL),
  });

  const tokenId = 3n;
  const price = parseEther('69');

  console.log('🏷️  Listing Logo NFT for Sale\n');
  console.log('Token ID:', tokenId.toString());
  console.log('Price: 69 BZAAR');

  const currentOwner = await publicClient.readContract({
    address: NFT_CONTRACT,
    abi: NFT_ABI,
    functionName: 'ownerOf',
    args: [tokenId],
  });
  console.log('Current Owner:', currentOwner);

  const listing = await publicClient.readContract({
    address: NFT_CONTRACT,
    abi: NFT_ABI,
    functionName: 'getListing',
    args: [tokenId],
  });

  if (listing[2]) {
    console.log('✅ Already listed for', (listing[1] / (10n ** 18n)).toString(), 'BZAAR');
    return;
  }

  console.log('\n📝 Step 1: Approve NFT contract...');
  const approveHash = await walletClient.writeContract({
    address: NFT_CONTRACT,
    abi: NFT_ABI,
    functionName: 'approve',
    args: [NFT_CONTRACT, tokenId],
  });
  await publicClient.waitForTransactionReceipt({ hash: approveHash });
  console.log('✅ Approved');

  console.log('\n📝 Step 2: List for sale...');
  const listHash = await walletClient.writeContract({
    address: NFT_CONTRACT,
    abi: NFT_ABI,
    functionName: 'listForSale',
    args: [tokenId, price],
  });
  await publicClient.waitForTransactionReceipt({ hash: listHash });
  
  console.log('\n✅ Listed for 69 BZAAR!');
  console.log('TX: https://sepolia.basescan.org/tx/' + listHash);
  console.log('\n🛒 Ready for purchase!');
}

listNFT().catch(console.error);
