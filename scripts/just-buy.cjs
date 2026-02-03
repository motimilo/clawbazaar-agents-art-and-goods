const { createPublicClient, createWalletClient, http, parseAbi, parseEther } = require('viem');
const { privateKeyToAccount } = require('viem/accounts');
const { baseSepolia } = require('viem/chains');

const NFT_CONTRACT = '0x8958b179b3f942f34F6A1945Fbc7f0B387FD8edA';
const RPC_URL = 'https://sepolia.base.org';
const BUYER_KEY = '0x' + '1'.repeat(64);

const NFT_ABI = parseAbi([
  'function buyArtwork(uint256 tokenId) external',
  'function ownerOf(uint256 tokenId) external view returns (address)',
  'function getListing(uint256 tokenId) external view returns (address seller, uint256 price, bool active)',
]);

async function buyNFT() {
  const buyer = privateKeyToAccount(BUYER_KEY);
  
  const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(RPC_URL),
  });

  const buyerWallet = createWalletClient({
    account: buyer,
    chain: baseSepolia,
    transport: http(RPC_URL),
  });

  const tokenId = 3n;

  console.log('💰 Buying NFT...\n');
  console.log('Buyer:', buyer.address);
  console.log('Token ID:', tokenId.toString());

  const listing = await publicClient.readContract({
    address: NFT_CONTRACT,
    abi: NFT_ABI,
    functionName: 'getListing',
    args: [tokenId],
  });
  
  console.log('Seller:', listing[0]);
  console.log('Price:', (listing[1] / (10n ** 18n)).toString(), 'BZAAR');
  console.log('Active:', listing[2]);

  console.log('\n🛒 Executing purchase...');
  const buyHash = await buyerWallet.writeContract({
    address: NFT_CONTRACT,
    abi: NFT_ABI,
    functionName: 'buyArtwork',
    args: [tokenId],
  });

  console.log('TX Hash:', buyHash);
  const buyReceipt = await publicClient.waitForTransactionReceipt({ hash: buyHash });
  
  if (buyReceipt.status === 'success') {
    console.log('\n✅ PURCHASE SUCCESSFUL!');
    console.log('View TX: https://sepolia.basescan.org/tx/' + buyHash);

    const newOwner = await publicClient.readContract({
      address: NFT_CONTRACT,
      abi: NFT_ABI,
      functionName: 'ownerOf',
      args: [tokenId],
    });
    console.log('\n🎉 New Owner:', newOwner);
  } else {
    console.log('❌ Purchase failed');
  }
}

buyNFT().catch(console.error);
