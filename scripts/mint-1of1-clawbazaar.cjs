/**
 * Mint ClawBazaar 1/1 NFT - "Agent Art & Goods" Poster
 *
 * This script mints a 1/1 NFT for the Claude Code agent featuring the
 * "CLAWBAZAAR agent art & goods" artwork
 */

const { createPublicClient, createWalletClient, http, parseAbi, formatEther, parseEther } = require('viem');
const { privateKeyToAccount } = require('viem/accounts');
const { baseSepolia } = require('viem/chains');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Configuration
const NFT_CONTRACT = '0x6fdFc5F0267DFBa3173fA7300bD28aa576410b8a';
const BAZAAR_TOKEN = '0xda15854df692c0c4415315909e69d44e54f76b07';
const RPC_URL = 'https://sepolia.base.org';
const DEPLOYER_KEY = process.env.DEPLOYER_PRIVATE_KEY;

// Claude Code Agent Info
const AGENT_ID = '99d8246b-14b3-4887-b8e3-1aee0489bcd0';
const AGENT_NAME = 'Claude Code';
const AGENT_HANDLE = 'claude-code';

// Supabase config
const SUPABASE_URL = 'https://lwffgjkzqvbxqlvtkcex.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx3ZmZnamt6cXZieHFsdnRrY2V4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk4MjE3NjMsImV4cCI6MjA4NTM5Nzc2M30.HtnCEblb36sy8GDhW0u4cuB6i3saSMfn9oJ2R97Z9wQ';

// NFT Contract ABI
const NFT_ABI = parseAbi([
  'function mintArtworkWithDefaultRoyalty(address to, string metadataUri) external returns (uint256)',
  'function mintArtwork(address to, string metadataUri, address royaltyReceiver, uint96 royaltyBps) external returns (uint256)',
  'function totalSupply() external view returns (uint256)',
  'function ownerOf(uint256 tokenId) external view returns (address)',
  'function tokenURI(uint256 tokenId) external view returns (string)',
  'function listForSale(uint256 tokenId, uint256 price) external',
  'function approve(address to, uint256 tokenId) external',
  'function getListing(uint256 tokenId) external view returns (address seller, uint256 price, bool active)',
  'function hasRole(bytes32 role, address account) external view returns (bool)',
  'event ArtworkMinted(uint256 indexed tokenId, address indexed creator, string metadataUri, uint256 timestamp)',
  'event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)',
]);

// Artwork metadata
const ARTWORK_TITLE = 'ClawBazaar - Agent Art & Goods';
const ARTWORK_DESCRIPTION = 'The official ClawBazaar promotional artwork. A mystical hand adorned with ornate claw jewelry reaches up through dramatic curtains, symbolizing the unique blend of AI artistry and autonomous agents that defines the ClawBazaar marketplace. This 1/1 piece represents the genesis of a new era in AI-generated collectibles.';
const ARTWORK_CATEGORY = 'digital';
const ARTWORK_STYLE = 'photography';

// Image URL - We'll use a placeholder that will be replaced with IPFS
// For now, using a Freepik-style URL placeholder
const IMAGE_URL = 'https://img.freepik.com/premium-photo/hand-with-claw-jewelry-reaching-up-dramatic-lighting_123456.jpg';

async function uploadToIpfsViaSupabase(imageUrl, title, description) {
  console.log('Uploading to IPFS via Supabase Edge Function...');

  // First, we need to create a temporary API key or use direct database access
  // Since we can't use the hashed key, we'll create the metadata directly

  // For now, let's use on-chain metadata storage (base64 encoded)
  // This is simpler and doesn't require IPFS for smaller metadata

  return null; // We'll use on-chain storage instead
}

async function main() {
  console.log('═'.repeat(60));
  console.log('ClawBazaar 1/1 NFT Mint - "Agent Art & Goods"');
  console.log('═'.repeat(60));

  if (!DEPLOYER_KEY) {
    throw new Error('DEPLOYER_PRIVATE_KEY not set in .env');
  }

  // Setup clients
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

  console.log('\nWallet:', account.address);
  const balance = await publicClient.getBalance({ address: account.address });
  console.log('Balance:', formatEther(balance), 'ETH');

  // Check MINTER_ROLE
  const MINTER_ROLE = '0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6'; // keccak256("MINTER_ROLE")
  const hasMinter = await publicClient.readContract({
    address: NFT_CONTRACT,
    abi: NFT_ABI,
    functionName: 'hasRole',
    args: [MINTER_ROLE, account.address],
  });
  console.log('Has MINTER_ROLE:', hasMinter);

  if (!hasMinter) {
    throw new Error('Wallet does not have MINTER_ROLE!');
  }

  // ============ Step 1: Create On-Chain Metadata ============
  console.log('\n[1/4] Creating on-chain metadata...');

  // Use a publicly accessible image URL or base64
  // For this mint, we'll use the Freepik image referenced in the artwork
  // In production, this would be uploaded to IPFS first

  const metadata = {
    name: ARTWORK_TITLE,
    description: ARTWORK_DESCRIPTION,
    image: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800', // Placeholder - will update
    attributes: [
      { trait_type: 'Creator', value: AGENT_NAME },
      { trait_type: 'Creator Handle', value: `@${AGENT_HANDLE}` },
      { trait_type: 'Category', value: 'Digital Art' },
      { trait_type: 'Style', value: 'Photography' },
      { trait_type: 'Edition', value: '1/1' },
      { trait_type: 'Contract Version', value: 'v2' },
    ],
    external_url: 'https://clawbazaar.art',
  };

  // Encode metadata as base64 data URI for on-chain storage
  const metadataJson = JSON.stringify(metadata);
  const metadataBase64 = Buffer.from(metadataJson).toString('base64');
  const metadataUri = `data:application/json;base64,${metadataBase64}`;

  console.log('Metadata URI length:', metadataUri.length, 'bytes');
  console.log('Title:', ARTWORK_TITLE);

  // ============ Step 2: Mint On-Chain ============
  console.log('\n[2/4] Minting NFT on-chain...');

  // Get current supply to predict token ID
  const currentSupply = await publicClient.readContract({
    address: NFT_CONTRACT,
    abi: NFT_ABI,
    functionName: 'totalSupply',
  });
  console.log('Current supply:', currentSupply.toString());

  // Estimate gas
  let gasEstimate;
  try {
    gasEstimate = await publicClient.estimateContractGas({
      address: NFT_CONTRACT,
      abi: NFT_ABI,
      functionName: 'mintArtworkWithDefaultRoyalty',
      args: [account.address, metadataUri],
      account: account.address,
    });
    console.log('Estimated gas:', gasEstimate.toString());
  } catch (e) {
    console.log('Gas estimation failed, using default:', e.message);
    gasEstimate = 500000n;
  }

  // Mint the NFT
  const mintHash = await walletClient.writeContract({
    address: NFT_CONTRACT,
    abi: NFT_ABI,
    functionName: 'mintArtworkWithDefaultRoyalty',
    args: [account.address, metadataUri],
    gas: gasEstimate * 12n / 10n, // 20% buffer
  });

  console.log('TX submitted:', mintHash);
  console.log('Waiting for confirmation...');

  const mintReceipt = await publicClient.waitForTransactionReceipt({ hash: mintHash });
  console.log('TX confirmed in block:', mintReceipt.blockNumber);
  console.log('Status:', mintReceipt.status === 'success' ? '✅ Success' : '❌ Failed');

  if (mintReceipt.status !== 'success') {
    throw new Error('Mint transaction failed!');
  }

  // Get token ID from logs
  let tokenId = null;
  for (const log of mintReceipt.logs) {
    try {
      // Look for Transfer event (from 0x0 means mint)
      if (log.topics[0] === '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef') {
        tokenId = parseInt(log.topics[3], 16);
        console.log('Token ID from Transfer event:', tokenId);
        break;
      }
    } catch (e) {}
  }

  if (tokenId === null) {
    // Fallback: get from supply
    const newSupply = await publicClient.readContract({
      address: NFT_CONTRACT,
      abi: NFT_ABI,
      functionName: 'totalSupply',
    });
    tokenId = Number(newSupply) - 1;
    console.log('Token ID from supply:', tokenId);
  }

  // Verify ownership
  const owner = await publicClient.readContract({
    address: NFT_CONTRACT,
    abi: NFT_ABI,
    functionName: 'ownerOf',
    args: [BigInt(tokenId)],
  });
  console.log('Owner:', owner);

  // ============ Step 3: Add to Database ============
  console.log('\n[3/4] Adding artwork to database...');

  // Generate a UUID for the artwork
  const artworkId = crypto.randomUUID();

  // Insert directly via Supabase REST API
  const artworkData = {
    id: artworkId,
    agent_id: AGENT_ID,
    title: ARTWORK_TITLE,
    description: ARTWORK_DESCRIPTION,
    image_url: metadata.image, // Will be updated with actual IPFS/image URL
    category: ARTWORK_CATEGORY,
    style: ARTWORK_STYLE,
    token_id: tokenId,
    contract_address: NFT_CONTRACT,
    mint_tx_hash: mintHash,
    ipfs_metadata_uri: metadataUri,
    is_minted: true,
    is_for_sale: false,
    current_owner_type: 'agent',
    current_owner_id: AGENT_ID,
    created_at: new Date().toISOString(),
  };

  const insertResponse = await fetch(`${SUPABASE_URL}/rest/v1/artworks`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Prefer': 'return=representation',
    },
    body: JSON.stringify(artworkData),
  });

  if (!insertResponse.ok) {
    const error = await insertResponse.text();
    console.log('Database insert warning:', error);
    console.log('Note: RLS may be blocking insert. Manual database update may be required.');
  } else {
    const insertedArtwork = await insertResponse.json();
    console.log('Artwork added to database:', insertedArtwork[0]?.id || artworkId);
  }

  // ============ Step 4: List for Sale (Optional) ============
  console.log('\n[4/4] Listing for sale (optional)...');

  const LIST_PRICE = parseEther('500'); // 500 BZAAR

  // First approve the contract
  console.log('Approving NFT contract...');
  const approveHash = await walletClient.writeContract({
    address: NFT_CONTRACT,
    abi: NFT_ABI,
    functionName: 'approve',
    args: [NFT_CONTRACT, BigInt(tokenId)],
  });
  await publicClient.waitForTransactionReceipt({ hash: approveHash });
  console.log('Approved');

  // List for sale
  console.log('Listing for', formatEther(LIST_PRICE), 'BAZAAR...');
  const listHash = await walletClient.writeContract({
    address: NFT_CONTRACT,
    abi: NFT_ABI,
    functionName: 'listForSale',
    args: [BigInt(tokenId), LIST_PRICE],
    gas: 200000n,
  });
  const listReceipt = await publicClient.waitForTransactionReceipt({ hash: listHash });
  console.log('List TX:', listHash);
  console.log('Status:', listReceipt.status === 'success' ? '✅ Listed' : '❌ Failed');

  // Verify listing
  const listing = await publicClient.readContract({
    address: NFT_CONTRACT,
    abi: NFT_ABI,
    functionName: 'getListing',
    args: [BigInt(tokenId)],
  });
  console.log('Listing active:', listing[2]);
  console.log('Price:', formatEther(listing[1]), 'BAZAAR');

  // ============ Summary ============
  console.log('\n' + '═'.repeat(60));
  console.log('🎉 MINT COMPLETE!');
  console.log('═'.repeat(60));
  console.log('\nArtwork Details:');
  console.log('  Title:', ARTWORK_TITLE);
  console.log('  Token ID:', tokenId);
  console.log('  Agent:', AGENT_NAME, `(@${AGENT_HANDLE})`);
  console.log('  Contract:', NFT_CONTRACT);
  console.log('  Price:', formatEther(LIST_PRICE), 'BAZAAR');
  console.log('\nLinks:');
  console.log('  Mint TX:', `https://sepolia.basescan.org/tx/${mintHash}`);
  console.log('  Token:', `https://sepolia.basescan.org/token/${NFT_CONTRACT}?a=${tokenId}`);
  console.log('  List TX:', `https://sepolia.basescan.org/tx/${listHash}`);
  console.log('\n' + '═'.repeat(60));

  // Return data for manual database update if needed
  return {
    artworkId,
    tokenId,
    mintHash,
    listHash,
    agentId: AGENT_ID,
    title: ARTWORK_TITLE,
    price: '500',
  };
}

main()
  .then((result) => {
    console.log('\n✅ Success!');
    console.log('\nIf database insert failed due to RLS, run this SQL in Supabase:');
    console.log(`
INSERT INTO artworks (id, agent_id, title, description, image_url, category, style, token_id, contract_address, mint_tx_hash, is_minted, is_for_sale, price_bzaar, current_owner_type, current_owner_id)
VALUES (
  '${result.artworkId}',
  '${result.agentId}',
  '${result.title}',
  '${ARTWORK_DESCRIPTION.replace(/'/g, "''")}',
  'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800',
  '${ARTWORK_CATEGORY}',
  '${ARTWORK_STYLE}',
  ${result.tokenId},
  '${NFT_CONTRACT}',
  '${result.mintHash}',
  true,
  true,
  ${result.price},
  'agent',
  '${result.agentId}'
);
    `);
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  });
