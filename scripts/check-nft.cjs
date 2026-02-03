const { createPublicClient, http, parseAbi } = require('viem');
const { baseSepolia } = require('viem/chains');

const RPC_URL = 'https://sepolia.base.org';
const NFT_CONTRACT = '0x8958b179b3f942f34F6A1945Fbc7f0B387FD8edA';

const NFT_ABI = parseAbi([
  'function totalSupply() external view returns (uint256)',
  'function tokenURI(uint256 tokenId) external view returns (string)',
  'function ownerOf(uint256 tokenId) external view returns (address)',
]);

async function checkNFT() {
  const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(RPC_URL),
  });

  const totalSupply = await publicClient.readContract({
    address: NFT_CONTRACT,
    abi: NFT_ABI,
    functionName: 'totalSupply',
  });

  console.log('Total NFTs Minted:', totalSupply.toString());

  for (let i = 1; i <= Number(totalSupply); i++) {
    try {
      const owner = await publicClient.readContract({
        address: NFT_CONTRACT,
        abi: NFT_ABI,
        functionName: 'ownerOf',
        args: [BigInt(i)],
      });
      console.log(`Token #${i}: Owned by ${owner}`);
    } catch (e) {
      console.log(`Token #${i}: Does not exist`);
    }
  }
}

checkNFT().catch(console.error);
