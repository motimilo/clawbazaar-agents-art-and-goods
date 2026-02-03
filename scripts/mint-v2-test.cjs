/**
 * Complete Mint Flow Test for v2 Contracts
 *
 * Tests: Register Agent → Prepare Artwork → Mint on-chain → Confirm → List for Sale
 */

const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const SUPABASE_URL = process.env.CLAWBAZAAR_SUPABASE_URL || "https://lwffgjkzqvbxqlvtkcex.supabase.co";
const SUPABASE_ANON_KEY = process.env.CLAWBAZAAR_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const API_URL = `${SUPABASE_URL}/functions/v1`;
const RPC_URL = "https://sepolia.base.org";

// v2 Contracts
const NFT_CONTRACT = "0x20d1Ab845aAe08005cEc04A9bdb869A29A2b45FF";
const BAZAAR_TOKEN = "0xda15854df692c0c4415315909e69d44e54f76b07";

const PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY;
if (!SUPABASE_ANON_KEY) {
  throw new Error("Missing Supabase anon key. Set CLAWBAZAAR_SUPABASE_ANON_KEY (or SUPABASE_ANON_KEY).");
}

// NFT ABI for v2
const NFT_ABI = [
  "function mintArtworkWithDefaultRoyalty(address to, string metadataUri) external returns (uint256)",
  "function mintArtwork(address to, string metadataUri, address royaltyReceiver, uint96 royaltyBps) external returns (uint256)",
  "function totalSupply() external view returns (uint256)",
  "function ownerOf(uint256 tokenId) external view returns (address)",
  "function tokenURI(uint256 tokenId) external view returns (string)",
  "function listForSale(uint256 tokenId, uint256 price) external",
  "function approve(address to, uint256 tokenId) external",
  "function setApprovalForAll(address operator, bool approved) external",
  "function getListing(uint256 tokenId) external view returns (address seller, uint256 price, bool active)",
  "function hasRole(bytes32 role, address account) external view returns (bool)",
  "event ArtworkMinted(uint256 indexed tokenId, address indexed creator, string metadataUri, uint256 timestamp)",
  "event ArtworkListed(uint256 indexed tokenId, address indexed seller, uint256 price)"
];

// Sample image - ClawBazaar themed SVG (small for on-chain storage)
const SAMPLE_IMAGE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#1a1a2e"/>
      <stop offset="100%" style="stop-color:#16213e"/>
    </linearGradient>
    <linearGradient id="claw" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#e94560"/>
      <stop offset="100%" style="stop-color:#ff6b6b"/>
    </linearGradient>
  </defs>
  <rect width="400" height="400" fill="url(#bg)"/>
  <text x="200" y="100" text-anchor="middle" font-family="Arial Black" font-size="36" fill="#fff">CLAWBAZAAR</text>
  <text x="200" y="140" text-anchor="middle" font-family="Arial" font-size="18" fill="#888">agent art & goods</text>
  <path d="M150 200 Q200 150 250 200 L270 280 Q200 320 130 280 Z" fill="url(#claw)" opacity="0.9"/>
  <circle cx="180" cy="230" r="8" fill="#fff"/>
  <circle cx="220" cy="230" r="8" fill="#fff"/>
  <text x="200" y="370" text-anchor="middle" font-family="monospace" font-size="12" fill="#666">v2 Contract Test</text>
</svg>`;

async function apiCall(endpoint, method, body) {
  const response = await fetch(`${API_URL}/${endpoint}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
      "apikey": SUPABASE_ANON_KEY
    },
    body: body ? JSON.stringify(body) : undefined
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(`API Error: ${JSON.stringify(data)}`);
  }
  return data;
}

async function main() {
  console.log("=".repeat(60));
  console.log("ClawBazaar v2 Contract - Full Mint Flow Test");
  console.log("=".repeat(60));

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  const nftContract = new ethers.Contract(NFT_CONTRACT, NFT_ABI, wallet);

  console.log("\nWallet:", wallet.address);
  const balance = await provider.getBalance(wallet.address);
  console.log("Balance:", ethers.formatEther(balance), "ETH");

  // Check MINTER_ROLE
  const MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MINTER_ROLE"));
  const hasMinter = await nftContract.hasRole(MINTER_ROLE, wallet.address);
  console.log("Has MINTER_ROLE:", hasMinter);

  if (!hasMinter) {
    throw new Error("Wallet doesn't have MINTER_ROLE!");
  }

  // ============ Step 1: Register Agent (with unique wallet) ============
  console.log("\n[1/6] Setting up agent...");

  const timestamp = Date.now();

  // Create a new wallet for this specific test (derived from main wallet)
  const testWallet = ethers.Wallet.createRandom();
  console.log("Test agent wallet:", testWallet.address);

  const agentData = {
    name: `ClawArtist_v2_${timestamp}`,
    handle: `clawartist_v2_${timestamp}`,
    description: "Test agent for v2 contract mint flow",
    wallet_address: testWallet.address  // Use unique wallet
  };

  const registerResult = await apiCall("agent-auth/register", "POST", agentData);
  const agentName = registerResult.agent?.name || registerResult.name;
  const apiKey = registerResult.api_key;
  const agentId = registerResult.agent?.id || registerResult.id;
  console.log("Agent registered:", agentName);
  console.log("API Key:", apiKey?.substring(0, 20) + "...");
  console.log("Agent ID:", agentId);

  // ============ Step 2: Prepare Artwork ============
  console.log("\n[2/6] Preparing artwork...");

  // Convert SVG to base64 data URI
  const imageBase64 = Buffer.from(SAMPLE_IMAGE_SVG).toString('base64');
  const imageDataUri = `data:image/svg+xml;base64,${imageBase64}`;

  const artworkData = {
    api_key: apiKey,
    title: "ClawBazaar Genesis v2",
    description: "First artwork minted on the production-ready v2 contracts. Features improved security with OpenZeppelin best practices.",
    image_url: imageDataUri,  // Include the image data URI
    category: "digital",
    style: "abstract"
  };

  const prepareResult = await apiCall("artworks-api/prepare", "POST", artworkData);
  console.log("Artwork prepared, ID:", prepareResult.artwork_id);
  const artworkId = prepareResult.artwork_id;

  // ============ Step 3: Create On-Chain Metadata ============
  console.log("\n[3/6] Creating on-chain metadata...");

  const metadata = {
    name: artworkData.title,
    description: artworkData.description,
    image: imageDataUri,
    attributes: [
      { trait_type: "Creator", value: agentData.name },
      { trait_type: "Category", value: "Digital Art" },
      { trait_type: "Style", value: "Abstract" },
      { trait_type: "Contract Version", value: "v2" },
      { trait_type: "Storage", value: "On-Chain" }
    ],
    external_url: "https://clawbazaar.art"
  };

  const metadataJson = JSON.stringify(metadata);
  const metadataBase64 = Buffer.from(metadataJson).toString('base64');
  const metadataUri = `data:application/json;base64,${metadataBase64}`;

  console.log("Metadata URI length:", metadataUri.length, "bytes");

  // ============ Step 4: Mint On-Chain ============
  console.log("\n[4/6] Minting NFT on-chain (v2 contract)...");

  // Use higher gas limit for on-chain metadata storage
  const estimatedGas = await nftContract.mintArtworkWithDefaultRoyalty.estimateGas(
    wallet.address,
    metadataUri
  ).catch(() => 800000n);

  console.log("Estimated gas:", estimatedGas.toString());

  const tx = await nftContract.mintArtworkWithDefaultRoyalty(
    wallet.address,
    metadataUri,
    { gasLimit: estimatedGas * 12n / 10n }  // Add 20% buffer
  );

  console.log("TX submitted:", tx.hash);
  const receipt = await tx.wait();
  console.log("TX confirmed in block:", receipt.blockNumber);

  // Wait for indexing
  await new Promise(r => setTimeout(r, 2000));

  // Get token ID from logs
  let tokenId = null;
  for (const log of receipt.logs) {
    try {
      const parsed = nftContract.interface.parseLog({ topics: log.topics, data: log.data });
      if (parsed?.name === "ArtworkMinted") {
        tokenId = Number(parsed.args.tokenId);
        console.log("Token ID:", tokenId);
        break;
      }
    } catch (e) {}
  }

  if (tokenId === null) {
    const supply = await nftContract.totalSupply();
    tokenId = Number(supply) - 1;
    console.log("Token ID (from supply):", tokenId);
  }

  // Verify ownership with retry
  let owner;
  for (let i = 0; i < 3; i++) {
    try {
      owner = await nftContract.ownerOf(tokenId);
      console.log("Owner:", owner);
      break;
    } catch (e) {
      console.log("Waiting for indexing...");
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  // ============ Step 5: Confirm in Database ============
  console.log("\n[5/6] Confirming mint in database...");

  const confirmData = {
    api_key: apiKey,
    artwork_id: artworkId,
    token_id: tokenId,
    tx_hash: tx.hash,
    contract_address: NFT_CONTRACT,
    ipfs_metadata_uri: metadataUri
  };

  const confirmResult = await apiCall("artworks-api/confirm", "POST", confirmData);
  console.log("Mint confirmed:", confirmResult.message || "success");

  // ============ Step 6: List for Sale ============
  console.log("\n[6/6] Listing artwork for sale...");

  // Get fresh nonce
  let nonce = await provider.getTransactionCount(wallet.address, "latest");

  // Approve contract first
  console.log("Approving NFT contract...");
  const approveTx = await nftContract.approve(NFT_CONTRACT, tokenId, { nonce: nonce++ });
  await approveTx.wait();
  console.log("Approved");

  // List for 100 BAZAAR
  const listPrice = ethers.parseEther("100");
  const listTx = await nftContract.listForSale(tokenId, listPrice, { gasLimit: 200000, nonce: nonce++ });
  console.log("List TX:", listTx.hash);
  const listReceipt = await listTx.wait();
  console.log("List confirmed in block:", listReceipt.blockNumber);

  // Wait a moment then verify listing
  await new Promise(r => setTimeout(r, 2000));
  const listing = await nftContract.getListing(tokenId);
  console.log("Listing active:", listing.active);
  console.log("Price:", ethers.formatEther(listing.price), "BAZAAR");

  // Update database with correct field name
  const listData = {
    api_key: apiKey,
    artwork_id: artworkId,
    price_bzaar: "100",  // Correct field name
    tx_hash: listTx.hash
  };

  await apiCall("artworks-api/list", "POST", listData);
  console.log("Listing confirmed in database");

  // ============ Summary ============
  console.log("\n" + "=".repeat(60));
  console.log("MINT FLOW COMPLETE!");
  console.log("=".repeat(60));
  console.log("\nAgent:", agentData.name);
  console.log("Artwork:", artworkData.title);
  console.log("Token ID:", tokenId);
  console.log("Contract:", NFT_CONTRACT);
  console.log("Price: 100 BZAAR");
  console.log("\nView on BaseScan:");
  console.log(`  https://sepolia.basescan.org/tx/${tx.hash}`);
  console.log(`  https://sepolia.basescan.org/token/${NFT_CONTRACT}?a=${tokenId}`);
  console.log("\nView on Marketplace:");
  console.log(`  http://localhost:5173/artwork/${artworkId}`);
  console.log("=".repeat(60));

  return { tokenId, artworkId, txHash: tx.hash, agentName: agentData.name };
}

main()
  .then((result) => {
    console.log("\n✅ Success:", result);
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Error:", error.message);
    process.exit(1);
  });
