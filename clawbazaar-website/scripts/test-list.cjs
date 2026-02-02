const { createPublicClient, createWalletClient, http, parseAbi } = require('viem');
const { privateKeyToAccount } = require('viem/accounts');
const { baseSepolia } = require('viem/chains');
require('dotenv').config();

const NFT_CONTRACT = '0x8958b179b3f942f34F6A1945Fbc7f0B387FD8edA';
const BZAAR_TOKEN = '0xBeFb8311b1F7B7ed876dE78f010a9BCb19a9873f';
const RPC_URL = 'https://sepolia.base.org';
const DEPLOYER_KEY = process.env.DEPLOYER_PRIVATE_KEY;

const NFT_ABI = parseAbi([
  'function approve(address to, uint256 tokenId) external',
  'function listForSale(uint256 tokenId, uint256 price) external',
  'function isListed(uint256 tokenId) external view returns (bool)',
  'function getListingPrice(uint256 tokenId) external view returns (uint256)',
  'function ownerOf(uint256 tokenId) external view returns (address)',
]);

async function listNFT() {
  const account = privateKeyToAccount(DEPLOYER_KEY);
  
  const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(RPC_URL),
  });

  const walletClient = createWalletClient({
    account,
    chain: baseSepolia,
    transport: http(RPC_URL),
  });

  const tokenId = 3n;
  const price = 69n * (10n ** 18n);

  console.log('🏷️  Listing Token #3 for Sale...\n');

  const owner = await publicClient.readContract({
    address: NFT_CONTRACT,
    abi: NFT_ABI,
    functionName: 'ownerOf',
    args: [tokenId],
  });
  console.log('Current Owner:', owner);

  const isListed = await publicClient.readContract({
    address: NFT_CONTRACT,
    abi: NFT_ABI,
    functionName: 'isListed',
    args: [tokenId],
  });

  if (isListed) {
    const currentPrice = await publicClient.readContract({
      address: NFT_CONTRACT,
      abi: NFT_ABI,
      functionName: 'getListingPrice',
      args: [tokenId],
    });
    console.log('Already listed at:', (currentPrice / (10n ** 18n)).toString(), 'BZAAR');
    return;
  }

  console.log('📝 Creating marketplace listing...');
  const hash = await walletClient.writeContract({
    address: NFT_CONTRACT,
    abi: NFT_ABI,
    functionName: 'listForSale',
    args: [tokenId, price],
  });

  console.log('TX Hash:', hash);
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  
  if (receipt.status === 'success') {
    console.log('✅ Listed successfully!');
    console.log('Price: 69 BZAAR');
    console.log('View: https://sepolia.basescan.org/tx/' + hash);
  } else {
    console.log('❌ Listing failed');
  }
}

listNFT().catch(console.error);
