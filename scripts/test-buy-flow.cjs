/**
 * Test Buy Flow Script
 * Tests the complete marketplace flow:
 * 1. Check balances
 * 2. Mint NFT (if needed)
 * 3. List NFT for sale
 * 4. Buy NFT (verifying 5% burn + 5% royalty)
 */

const { createPublicClient, createWalletClient, http, parseAbi, formatEther, parseEther } = require('viem');
const { privateKeyToAccount } = require('viem/accounts');
const { baseSepolia } = require('viem/chains');
require('dotenv').config();

// Contract addresses from deployment-v2.json
const BAZAAR_TOKEN = '0xda15854df692c0c4415315909e69d44e54f76b07';
const NFT_CONTRACT = '0x6fdFc5F0267DFBa3173fA7300bD28aa576410b8a';
const RPC_URL = 'https://sepolia.base.org';

const ERC20_ABI = parseAbi([
  'function balanceOf(address account) external view returns (uint256)',
  'function transfer(address to, uint256 amount) external returns (bool)',
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function allowance(address owner, address spender) external view returns (uint256)',
  'function symbol() external view returns (string)',
  'function totalSupply() external view returns (uint256)',
]);

const NFT_ABI = parseAbi([
  'function mintArtworkWithDefaultRoyalty(address to, string metadataUri) external returns (uint256)',
  'function listForSale(uint256 tokenId, uint256 price) external',
  'function buyArtwork(uint256 tokenId) external',
  'function getListing(uint256 tokenId) external view returns (address seller, uint256 price, bool active)',
  'function calculateBuyPrice(uint256 tokenId) external view returns (uint256 totalPrice, uint256 burnAmount, uint256 royaltyAmount, uint256 sellerAmount)',
  'function ownerOf(uint256 tokenId) external view returns (address)',
  'function tokenURI(uint256 tokenId) external view returns (string)',
  'function approve(address to, uint256 tokenId) external',
  'function getApproved(uint256 tokenId) external view returns (address)',
  'function setApprovalForAll(address operator, bool approved) external',
  'function isApprovedForAll(address owner, address operator) external view returns (bool)',
  'function totalSupply() external view returns (uint256)',
  'function totalBurned() external view returns (uint256)',
  'function platformFeeBps() external view returns (uint256)',
  'function defaultRoyaltyBps() external view returns (uint96)',
  'function getCreator(uint256 tokenId) external view returns (address)',
  'function hasRole(bytes32 role, address account) external view returns (bool)',
]);

const MINTER_ROLE = '0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6';

async function main() {
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║         ClawBazaar Buy Flow Test                              ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  const deployerKey = process.env.DEPLOYER_PRIVATE_KEY;
  if (!deployerKey) {
    console.error('❌ DEPLOYER_PRIVATE_KEY not found in .env');
    process.exit(1);
  }

  // Setup accounts
  const deployer = privateKeyToAccount(deployerKey);
  console.log('📍 Deployer/Admin:', deployer.address);

  // Check for buyer key (optional second account)
  const buyerKey = process.env.BUYER_PRIVATE_KEY || deployerKey;
  const buyer = privateKeyToAccount(buyerKey);
  console.log('📍 Buyer:', buyer.address);
  console.log('');

  // Setup clients
  const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(RPC_URL),
  });

  const deployerWallet = createWalletClient({
    account: deployer,
    chain: baseSepolia,
    transport: http(RPC_URL),
  });

  const buyerWallet = createWalletClient({
    account: buyer,
    chain: baseSepolia,
    transport: http(RPC_URL),
  });

  // ============ Step 1: Check contract config ============
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('Step 1: Contract Configuration');
  console.log('═══════════════════════════════════════════════════════════════');

  const [platformFeeBps, defaultRoyaltyBps, totalBurned] = await Promise.all([
    publicClient.readContract({ address: NFT_CONTRACT, abi: NFT_ABI, functionName: 'platformFeeBps' }),
    publicClient.readContract({ address: NFT_CONTRACT, abi: NFT_ABI, functionName: 'defaultRoyaltyBps' }),
    publicClient.readContract({ address: NFT_CONTRACT, abi: NFT_ABI, functionName: 'totalBurned' }),
  ]);

  console.log(`   Platform Fee: ${platformFeeBps / 100n}% (${platformFeeBps} bps)`);
  console.log(`   Default Royalty: ${defaultRoyaltyBps / 100n}% (${defaultRoyaltyBps} bps)`);
  console.log(`   Total BZAAR Burned: ${formatEther(totalBurned)} BZAAR`);
  console.log('');

  // ============ Step 2: Check balances ============
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('Step 2: Token Balances');
  console.log('═══════════════════════════════════════════════════════════════');

  const [deployerBalance, buyerBalance] = await Promise.all([
    publicClient.readContract({ address: BAZAAR_TOKEN, abi: ERC20_ABI, functionName: 'balanceOf', args: [deployer.address] }),
    publicClient.readContract({ address: BAZAAR_TOKEN, abi: ERC20_ABI, functionName: 'balanceOf', args: [buyer.address] }),
  ]);

  console.log(`   Deployer BZAAR: ${formatEther(deployerBalance)}`);
  console.log(`   Buyer BZAAR: ${formatEther(buyerBalance)}`);
  console.log('');

  // ============ Step 3: Check minter role ============
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('Step 3: Check Permissions');
  console.log('═══════════════════════════════════════════════════════════════');

  const hasMinterRole = await publicClient.readContract({
    address: NFT_CONTRACT,
    abi: NFT_ABI,
    functionName: 'hasRole',
    args: [MINTER_ROLE, deployer.address],
  });

  console.log(`   Deployer has MINTER_ROLE: ${hasMinterRole ? '✅' : '❌'}`);
  console.log('');

  if (!hasMinterRole) {
    console.log('❌ Deployer does not have MINTER_ROLE. Cannot proceed.');
    process.exit(1);
  }

  // ============ Step 4: Mint NFT ============
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('Step 4: Mint Test NFT');
  console.log('═══════════════════════════════════════════════════════════════');

  const metadataUri = 'ipfs://QmTest123/metadata.json';
  console.log(`   Minting NFT to: ${deployer.address}`);
  console.log(`   Metadata URI: ${metadataUri}`);

  const mintHash = await deployerWallet.writeContract({
    address: NFT_CONTRACT,
    abi: NFT_ABI,
    functionName: 'mintArtworkWithDefaultRoyalty',
    args: [deployer.address, metadataUri],
  });

  console.log(`   TX Hash: ${mintHash}`);
  const mintReceipt = await publicClient.waitForTransactionReceipt({ hash: mintHash });
  console.log(`   Status: ${mintReceipt.status === 'success' ? '✅ Success' : '❌ Failed'}`);

  // Get the token ID from events or total supply
  const totalSupply = await publicClient.readContract({
    address: NFT_CONTRACT,
    abi: NFT_ABI,
    functionName: 'totalSupply',
  });
  const tokenId = totalSupply - 1n;
  console.log(`   Token ID: ${tokenId}`);
  console.log('');

  // ============ Step 5: Approve & List for sale ============
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('Step 5: List NFT for Sale');
  console.log('═══════════════════════════════════════════════════════════════');

  const listPrice = parseEther('100'); // 100 BZAAR
  console.log(`   List Price: ${formatEther(listPrice)} BZAAR`);

  // Approve NFT contract
  console.log('   Approving NFT contract...');
  const approveNftHash = await deployerWallet.writeContract({
    address: NFT_CONTRACT,
    abi: NFT_ABI,
    functionName: 'setApprovalForAll',
    args: [NFT_CONTRACT, true],
  });
  await publicClient.waitForTransactionReceipt({ hash: approveNftHash });
  console.log('   ✅ NFT approval set');

  // List for sale
  console.log('   Listing NFT...');
  const listHash = await deployerWallet.writeContract({
    address: NFT_CONTRACT,
    abi: NFT_ABI,
    functionName: 'listForSale',
    args: [tokenId, listPrice],
  });
  const listReceipt = await publicClient.waitForTransactionReceipt({ hash: listHash });
  console.log(`   TX Hash: ${listHash}`);
  console.log(`   Status: ${listReceipt.status === 'success' ? '✅ NFT listed for sale' : '❌ Failed'}`);

  // Wait a moment for state to settle
  await new Promise(r => setTimeout(r, 2000));

  // Verify listing
  const listing = await publicClient.readContract({
    address: NFT_CONTRACT,
    abi: NFT_ABI,
    functionName: 'getListing',
    args: [tokenId],
  });
  console.log(`   Listing: Seller=${listing[0]}, Price=${formatEther(listing[1])} BZAAR, Active=${listing[2]}`);

  if (!listing[2]) {
    console.log('   ❌ Listing not active. Check contract state.');
    process.exit(1);
  }
  console.log('');

  // ============ Step 6: Calculate buy price breakdown ============
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('Step 6: Price Breakdown');
  console.log('═══════════════════════════════════════════════════════════════');

  const priceBreakdown = await publicClient.readContract({
    address: NFT_CONTRACT,
    abi: NFT_ABI,
    functionName: 'calculateBuyPrice',
    args: [tokenId],
  });

  console.log(`   Total Price:    ${formatEther(priceBreakdown[0])} BZAAR`);
  console.log(`   Platform Burn:  ${formatEther(priceBreakdown[1])} BZAAR (5%)`);
  console.log(`   Creator Royalty: ${formatEther(priceBreakdown[2])} BZAAR (5% of remaining)`);
  console.log(`   Seller Receives: ${formatEther(priceBreakdown[3])} BZAAR`);
  console.log('');

  // ============ Step 7: Execute Buy (if different buyer) ============
  if (deployer.address.toLowerCase() === buyer.address.toLowerCase()) {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('Step 7: Buy Flow (SKIPPED - same account)');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('   ⚠️  Buyer and seller are the same account.');
    console.log('   To test the full buy flow, set BUYER_PRIVATE_KEY in .env');
    console.log('');
  } else {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('Step 7: Execute Buy');
    console.log('═══════════════════════════════════════════════════════════════');

    // Check buyer has enough tokens
    if (buyerBalance < listPrice) {
      console.log(`   ❌ Buyer needs ${formatEther(listPrice)} BZAAR but only has ${formatEther(buyerBalance)}`);
      console.log('   Skipping buy step.');
    } else {
      // Approve BZAAR spending
      console.log('   Approving BAZAAR tokens...');
      const approveBzaarHash = await buyerWallet.writeContract({
        address: BAZAAR_TOKEN,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [NFT_CONTRACT, listPrice],
      });
      await publicClient.waitForTransactionReceipt({ hash: approveBzaarHash });
      console.log('   ✅ BZAAR approved');

      // Get balances before buy
      const [sellerBalanceBefore, creatorBalanceBefore, burnedBefore] = await Promise.all([
        publicClient.readContract({ address: BAZAAR_TOKEN, abi: ERC20_ABI, functionName: 'balanceOf', args: [deployer.address] }),
        publicClient.readContract({ address: BAZAAR_TOKEN, abi: ERC20_ABI, functionName: 'balanceOf', args: [deployer.address] }),
        publicClient.readContract({ address: NFT_CONTRACT, abi: NFT_ABI, functionName: 'totalBurned' }),
      ]);

      // Execute buy
      console.log('   Executing buy...');
      const buyHash = await buyerWallet.writeContract({
        address: NFT_CONTRACT,
        abi: NFT_ABI,
        functionName: 'buyArtwork',
        args: [tokenId],
      });
      const buyReceipt = await publicClient.waitForTransactionReceipt({ hash: buyHash });
      console.log(`   TX Hash: ${buyHash}`);
      console.log(`   Status: ${buyReceipt.status === 'success' ? '✅ Success' : '❌ Failed'}`);

      // Get balances after buy
      const [newOwner, sellerBalanceAfter, burnedAfter] = await Promise.all([
        publicClient.readContract({ address: NFT_CONTRACT, abi: NFT_ABI, functionName: 'ownerOf', args: [tokenId] }),
        publicClient.readContract({ address: BAZAAR_TOKEN, abi: ERC20_ABI, functionName: 'balanceOf', args: [deployer.address] }),
        publicClient.readContract({ address: NFT_CONTRACT, abi: NFT_ABI, functionName: 'totalBurned' }),
      ]);

      console.log('');
      console.log('   Results:');
      console.log(`   New Owner: ${newOwner}`);
      console.log(`   Seller received: ${formatEther(sellerBalanceAfter - sellerBalanceBefore)} BZAAR`);
      console.log(`   Tokens burned: ${formatEther(burnedAfter - burnedBefore)} BZAAR`);
      console.log(`   Total burned to date: ${formatEther(burnedAfter)} BZAAR`);
    }
    console.log('');
  }

  // ============ Summary ============
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('Summary');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`   ✅ NFT Contract: ${NFT_CONTRACT}`);
  console.log(`   ✅ BAZAAR Token: ${BAZAAR_TOKEN}`);
  console.log(`   ✅ Token ID: ${tokenId}`);
  console.log(`   ✅ Platform Fee: 5% (burned)`);
  console.log(`   ✅ Creator Royalty: 5%`);
  console.log('');
  console.log('View on BaseScan:');
  console.log(`   https://sepolia.basescan.org/address/${NFT_CONTRACT}`);
  console.log(`   https://sepolia.basescan.org/address/${BAZAAR_TOKEN}`);
}

main().catch(console.error);
