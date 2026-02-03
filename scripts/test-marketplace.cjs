const { createPublicClient, createWalletClient, http, parseAbi, parseEther } = require('viem');
const { privateKeyToAccount } = require('viem/accounts');
const { baseSepolia } = require('viem/chains');
require('dotenv').config();

const NFT_CONTRACT = '0x8958b179b3f942f34F6A1945Fbc7f0B387FD8edA';
const BAZAAR_TOKEN = '0x9E109Db8d920117A55f0d6a038E8CdBbaBC3459C';
const RPC_URL = 'https://sepolia.base.org';
const SELLER_KEY = process.env.DEPLOYER_PRIVATE_KEY;
const BUYER_KEY = '0x' + '1'.repeat(64);

const NFT_ABI = parseAbi([
  'function approve(address to, uint256 tokenId) external',
  'function listForSale(uint256 tokenId, uint256 price) external',
  'function getListing(uint256 tokenId) external view returns (address seller, uint256 price, bool active)',
  'function buyArtwork(uint256 tokenId) external',
  'function ownerOf(uint256 tokenId) external view returns (address)',
]);

const TOKEN_ABI = parseAbi([
  'function balanceOf(address account) external view returns (uint256)',
  'function transfer(address to, uint256 amount) external returns (bool)',
  'function approve(address spender, uint256 amount) external returns (bool)',
]);

async function testMarketplace() {
  const seller = privateKeyToAccount(SELLER_KEY);
  const buyer = privateKeyToAccount(BUYER_KEY);

  const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(RPC_URL),
  });

  const sellerWallet = createWalletClient({
    account: seller,
    chain: baseSepolia,
    transport: http(RPC_URL),
  });

  const buyerWallet = createWalletClient({
    account: buyer,
    chain: baseSepolia,
    transport: http(RPC_URL),
  });

  const tokenId = 3n;
  const price = parseEther('69');

  console.log('Testing ClawBazaar Marketplace\n');
  console.log('Seller:', seller.address);
  console.log('Buyer:', buyer.address);
  console.log('Token ID:', tokenId.toString());
  console.log('Price: 69 BAZAAR\n');

  const owner = await publicClient.readContract({
    address: NFT_CONTRACT,
    abi: NFT_ABI,
    functionName: 'ownerOf',
    args: [tokenId],
  });
  console.log('Current NFT Owner:', owner);

  const listing = await publicClient.readContract({
    address: NFT_CONTRACT,
    abi: NFT_ABI,
    functionName: 'getListing',
    args: [tokenId],
  });

  if (!listing[2]) {
    console.log('\nStep 1: Approve NFT contract...');
    const approveHash = await sellerWallet.writeContract({
      address: NFT_CONTRACT,
      abi: NFT_ABI,
      functionName: 'approve',
      args: [NFT_CONTRACT, tokenId],
    });
    await publicClient.waitForTransactionReceipt({ hash: approveHash });
    console.log('NFT Approved');

    console.log('\nStep 2: List NFT for sale...');
    const listHash = await sellerWallet.writeContract({
      address: NFT_CONTRACT,
      abi: NFT_ABI,
      functionName: 'listForSale',
      args: [tokenId, price],
    });
    await publicClient.waitForTransactionReceipt({ hash: listHash });
    console.log('Listed for 69 BAZAAR');
    console.log('   TX:', 'https://sepolia.basescan.org/tx/' + listHash);
  } else {
    console.log('Already listed for sale');
  }

  console.log('\nStep 3: Fund buyer with BAZAAR...');
  const buyerBalance = await publicClient.readContract({
    address: BAZAAR_TOKEN,
    abi: TOKEN_ABI,
    functionName: 'balanceOf',
    args: [buyer.address],
  });

  if (buyerBalance < price) {
    const transferHash = await sellerWallet.writeContract({
      address: BAZAAR_TOKEN,
      abi: TOKEN_ABI,
      functionName: 'transfer',
      args: [buyer.address, parseEther('100')],
    });
    await publicClient.waitForTransactionReceipt({ hash: transferHash });
    console.log('Transferred 100 BAZAAR to buyer');
  } else {
    console.log('Buyer already has BAZAAR');
  }

  console.log('\nStep 4: Buyer approves BAZAAR spending...');
  const approveTokenHash = await buyerWallet.writeContract({
    address: BAZAAR_TOKEN,
    abi: TOKEN_ABI,
    functionName: 'approve',
    args: [NFT_CONTRACT, parseEther('1000')],
  });
  await publicClient.waitForTransactionReceipt({ hash: approveTokenHash });
  console.log('BAZAAR spending approved');

  console.log('\nStep 5: Buy the NFT...');
  const buyHash = await buyerWallet.writeContract({
    address: NFT_CONTRACT,
    abi: NFT_ABI,
    functionName: 'buyArtwork',
    args: [tokenId],
  });
  const buyReceipt = await publicClient.waitForTransactionReceipt({ hash: buyHash });

  if (buyReceipt.status === 'success') {
    console.log('PURCHASE SUCCESSFUL!');
    console.log('   TX:', 'https://sepolia.basescan.org/tx/' + buyHash);

    const newOwner = await publicClient.readContract({
      address: NFT_CONTRACT,
      abi: NFT_ABI,
      functionName: 'ownerOf',
      args: [tokenId],
    });
    console.log('\nNew Owner:', newOwner);
    console.log('   (Should be buyer:', buyer.address + ')');
  } else {
    console.log('Purchase failed');
  }
}

testMarketplace().catch(console.error);
