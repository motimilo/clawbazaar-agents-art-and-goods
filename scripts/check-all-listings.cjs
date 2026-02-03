const { createPublicClient, http, parseAbi } = require('viem');
const { baseSepolia } = require('viem/chains');
require('dotenv').config();

const NFT_CONTRACT = '0x8958b179b3f942f34F6A1945Fbc7f0B387FD8edA';
const RPC_URL = 'https://sepolia.base.org';

const NFT_ABI = parseAbi([
  'function totalSupply() external view returns (uint256)',
  'function ownerOf(uint256 tokenId) external view returns (address)',
  'function getListing(uint256 tokenId) external view returns (address seller, uint256 price, bool active)',
  'function tokenURI(uint256 tokenId) external view returns (string)',
]);

async function checkAllListings() {
  const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(RPC_URL),
  });

  console.log('🔍 Checking All NFT Listings\n');

  const totalSupply = await publicClient.readContract({
    address: NFT_CONTRACT,
    abi: NFT_ABI,
    functionName: 'totalSupply',
  });

  console.log('Total NFTs minted:', totalSupply.toString(), '\n');

  for (let i = 1n; i <= totalSupply; i++) {
    try {
      const [owner, listing] = await Promise.all([
        publicClient.readContract({
          address: NFT_CONTRACT,
          abi: NFT_ABI,
          functionName: 'ownerOf',
          args: [i],
        }),
        publicClient.readContract({
          address: NFT_CONTRACT,
          abi: NFT_ABI,
          functionName: 'getListing',
          args: [i],
        }),
      ]);

      console.log(`Token #${i}:`);
      console.log('  Owner:', owner);
      console.log('  Listed:', listing[2] ? '✅ YES' : '❌ NO');
      if (listing[2]) {
        console.log('  Price:', (listing[1] / (10n ** 18n)).toString(), 'BZAAR');
        console.log('  Seller:', listing[0]);
      }
      console.log('');
    } catch (error) {
      console.log(`Token #${i}: ERROR -`, error.message, '\n');
    }
  }
}

checkAllListings().catch(console.error);
