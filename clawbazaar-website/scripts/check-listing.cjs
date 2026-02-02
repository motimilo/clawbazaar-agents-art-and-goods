const { createPublicClient, http, parseAbi } = require('viem');
const { baseSepolia } = require('viem/chains');

const NFT_CONTRACT = '0x8958b179b3f942f34F6A1945Fbc7f0B387FD8edA';
const RPC_URL = 'https://sepolia.base.org';

const NFT_ABI = parseAbi([
  'function ownerOf(uint256 tokenId) external view returns (address)',
  'function getListing(uint256 tokenId) external view returns (address seller, uint256 price, bool active)',
]);

async function checkListing() {
  const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(RPC_URL),
  });

  const tokenId = 3n;

  const owner = await publicClient.readContract({
    address: NFT_CONTRACT,
    abi: NFT_ABI,
    functionName: 'ownerOf',
    args: [tokenId],
  });

  const listing = await publicClient.readContract({
    address: NFT_CONTRACT,
    abi: NFT_ABI,
    functionName: 'getListing',
    args: [tokenId],
  });

  console.log('Token ID:', tokenId.toString());
  console.log('Owner:', owner);
  console.log('\nListing:');
  console.log('  Seller:', listing[0]);
  console.log('  Price:', (listing[1] / (10n ** 18n)).toString(), 'BZAAR');
  console.log('  Active:', listing[2]);
  
  const TX = '0xb61b1d8bd8c13d42aec386437f9520a2da2fb293afb1c5fa60631ed29d80efd3';
  const receipt = await publicClient.getTransactionReceipt({ hash: TX });
  
  console.log('\nTransaction Receipt:');
  console.log('  Status:', receipt.status);
  console.log('  Gas Used:', receipt.gasUsed.toString());
  console.log('  Logs:', receipt.logs.length);
  
  if (receipt.logs.length > 0) {
    console.log('\nEvent Logs:');
    receipt.logs.forEach((log, i) => {
      console.log(`  Log ${i}:`, log.address);
    });
  }
}

checkListing().catch(console.error);
