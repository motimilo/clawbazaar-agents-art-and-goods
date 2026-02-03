const { createPublicClient, createWalletClient, http, parseAbi } = require('viem');
const { privateKeyToAccount } = require('viem/accounts');
const { baseSepolia } = require('viem/chains');
const sharp = require('sharp');
const path = require('path');
require('dotenv').config();

const NFT_CONTRACT_ADDRESS = '0x8958b179b3f942f34F6A1945Fbc7f0B387FD8edA';
const RPC_URL = 'https://sepolia.base.org';
const DEPLOYER_KEY = process.env.DEPLOYER_PRIVATE_KEY;

const args = process.argv.slice(2);
if (args.length < 4) {
  console.error('Usage: node resize-and-mint.cjs <image-path> <title> <description> <tags> [price]');
  process.exit(1);
}

const [imagePath, title, description, tags, priceInBzaar] = args;

const NFT_ABI = parseAbi([
  'function mintArtworkWithDefaultRoyalty(address to, string metadataUri) external returns (uint256)',
  'function totalSupply() external view returns (uint256)',
]);

async function resizeImageToBase64(imagePath, maxSizeKB = 35) {
  let quality = 80;
  let width = 600;
  let resizedBuffer;
  let dataUri;

  do {
    resizedBuffer = await sharp(imagePath)
      .resize(width, width, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality })
      .toBuffer();

    const base64Image = resizedBuffer.toString('base64');
    dataUri = `data:image/jpeg;base64,${base64Image}`;
    const sizeKB = Math.round(dataUri.length / 1024);

    console.log(`   Width: ${width}px, Quality: ${quality}%, Size: ${sizeKB} KB`);

    if (sizeKB <= maxSizeKB) {
      break;
    }

    if (quality > 65) {
      quality -= 5;
    } else if (width > 400) {
      width -= 100;
      quality = 85;
    } else {
      break;
    }
  } while (true);

  return dataUri;
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

async function mintArtwork() {
  console.log('🎨 Minting ClawBazaar Logo...\n');

  const fullImagePath = path.isAbsolute(imagePath)
    ? imagePath
    : path.join(__dirname, '..', imagePath);

  console.log('📸 Resizing and compressing image...');
  const imageDataUri = await resizeImageToBase64(fullImagePath, 35);
  const imageSizeKB = Math.round(imageDataUri.length / 1024);
  console.log(`   Final image size: ${imageSizeKB} KB\n`);

  const tagArray = tags.split(',').map(t => t.trim());
  const attributes = tagArray.map(tag => ({ trait_type: 'Tag', value: tag }));

  console.log('📦 Creating on-chain metadata...');
  const metadataUri = createOnChainMetadata(
    title,
    description,
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
    gas: 20000000n,
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

  const { data: agentData } = await supabase
    .from('agents')
    .select('id')
    .limit(1)
    .single();

  const { data: categoryData } = await supabase
    .from('categories')
    .select('id')
    .eq('name', 'Digital Art')
    .single();

  const artworkData = {
    title,
    description,
    image_url: imagePath.replace(/^public\//, '/'),
    nft_status: 'minted',
    token_id: tokenId,
    mint_tx_hash: hash,
    contract_address: NFT_CONTRACT_ADDRESS,
    ipfs_metadata_uri: metadataUri,
    is_for_sale: priceInBzaar ? true : false,
    price_bzaar: priceInBzaar || null,
    agent_id: agentData?.id,
    category_id: categoryData?.id,
    style: tagArray[0] || 'Digital Art',
  };

  const { error: insertError } = await supabase
    .from('artworks')
    .insert(artworkData);

  if (insertError) {
    console.error('⚠️  Failed to insert into database:', insertError.message);
  } else {
    console.log('✅ Database updated!');
  }
}

mintArtwork().catch(console.error);
