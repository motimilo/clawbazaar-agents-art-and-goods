const { createPublicClient, createWalletClient, http, parseAbi } = require('viem');
const { privateKeyToAccount } = require('viem/accounts');
const { baseSepolia } = require('viem/chains');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const NFT_CONTRACT_ADDRESS = '0x8958b179b3f942f34F6A1945Fbc7f0B387FD8edA';
const RPC_URL = 'https://sepolia.base.org';
const DEPLOYER_KEY = process.env.DEPLOYER_PRIVATE_KEY;
const ARTWORK_ID = '176ce76b-ddf9-41df-b58d-16cef963d76d';

const NFT_ABI = parseAbi([
  'function mintArtworkWithDefaultRoyalty(address to, string metadataUri) external returns (uint256)',
  'function totalSupply() external view returns (uint256)',
]);

function imageToBase64DataUri(imagePath) {
  const imageBuffer = fs.readFileSync(imagePath);
  const base64Image = imageBuffer.toString('base64');
  const ext = path.extname(imagePath).toLowerCase();
  const mimeType = ext === '.png' ? 'image/png' : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'image/png';
  return `data:${mimeType};base64,${base64Image}`;
}

function createOnChainMetadata(title, description, imageDataUri, attributes = []) {
  const metadata = {
    name: title,
    description: description,
    image: imageDataUri,
    attributes: [
      { trait_type: 'Creator', value: 'ClawBazaar' },
      { trait_type: 'Storage', value: 'On-Chain' },
      ...attributes,
    ],
    external_url: 'https://clawbazaar.art',
  };

  const metadataJson = JSON.stringify(metadata);
  const metadataBase64 = Buffer.from(metadataJson).toString('base64');
  return `data:application/json;base64,${metadataBase64}`;
}

async function mintLogo() {
  console.log('🎨 Minting ClawBazaar Logo...\n');

  const imagePath = path.join(__dirname, '../public/freepik__make-type-logo-for-concept-3-clawbazaar-now-use-lo__26495.png');

  if (!fs.existsSync(imagePath)) {
    console.error('❌ Image file not found:', imagePath);
    process.exit(1);
  }

  console.log('📸 Converting image to base64...');
  const imageDataUri = imageToBase64DataUri(imagePath);
  const imageSizeKB = Math.round(imageDataUri.length / 1024);
  console.log(`   Image size: ${imageSizeKB} KB`);

  const attributes = [
    { trait_type: 'Category', value: 'Logo Design' },
    { trait_type: 'Type', value: 'Official Logo' },
  ];

  console.log('📦 Creating on-chain metadata...');
  const metadataUri = createOnChainMetadata(
    'ClawBazaar Official Logo',
    'The official ClawBazaar marketplace logo featuring a nautical design with EST. 2026',
    imageDataUri,
    attributes
  );
  const metadataSizeKB = Math.round(metadataUri.length / 1024);
  console.log(`   Metadata size: ${metadataSizeKB} KB\n`);

  const account = privateKeyToAccount(DEPLOYER_KEY);
  console.log('👤 Minting to:', account.address);

  const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(RPC_URL),
  });

  const walletClient = createWalletClient({
    account,
    chain: baseSepolia,
    transport: http(RPC_URL),
  });

  console.log('⛓️  Sending mint transaction...');
  const hash = await walletClient.writeContract({
    address: NFT_CONTRACT_ADDRESS,
    abi: NFT_ABI,
    functionName: 'mintArtworkWithDefaultRoyalty',
    args: [account.address, metadataUri],
  });

  console.log('   TX Hash:', hash);
  console.log('   Waiting for confirmation...\n');

  const receipt = await publicClient.waitForTransactionReceipt({ hash });

  let tokenId = 0;
  for (const log of receipt.logs) {
    if (log.topics[1]) {
      const potentialTokenId = parseInt(log.topics[1], 16);
      if (potentialTokenId > 0) {
        tokenId = potentialTokenId;
        break;
      }
    }
  }

  if (tokenId === 0) {
    const totalSupply = await publicClient.readContract({
      address: NFT_CONTRACT_ADDRESS,
      abi: NFT_ABI,
      functionName: 'totalSupply',
    });
    tokenId = Number(totalSupply);
  }

  console.log('✅ Mint successful!');
  console.log('   Token ID:', tokenId);
  console.log('   TX Hash:', hash);
  console.log('   View on BaseScan:', `https://sepolia.basescan.org/tx/${hash}`);
  console.log('   View NFT:', `https://sepolia.basescan.org/token/${NFT_CONTRACT_ADDRESS}?a=${tokenId}`);
  console.log('\n📝 Updating database...');

  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
  );

  const { error: updateError } = await supabase
    .from('artworks')
    .update({
      nft_status: 'minted',
      token_id: tokenId,
      mint_tx_hash: hash,
      contract_address: NFT_CONTRACT_ADDRESS,
      ipfs_metadata_uri: metadataUri,
    })
    .eq('id', ARTWORK_ID);

  if (updateError) {
    console.error('⚠️  Failed to update database:', updateError.message);
  } else {
    console.log('✅ Database updated!');
  }
}

mintLogo().catch(console.error);
