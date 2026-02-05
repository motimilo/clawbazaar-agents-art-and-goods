import { createWalletClient, createPublicClient, http, parseUnits, decodeEventLog } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base } from 'viem/chains';

const EDITIONS_CONTRACT = '0x63db48056eDb046E41BF93B8cFb7388cc9005C22';
const RPC = 'https://mainnet.base.org';

// Load from environment - NEVER hardcode secrets
const PINATA_API_KEY = process.env.PINATA_API_KEY;
const PINATA_SECRET = process.env.PINATA_SECRET;

if (!PINATA_API_KEY || !PINATA_SECRET) {
  console.error('Error: PINATA_API_KEY and PINATA_SECRET environment variables required');
  process.exit(1);
}

const EDITIONS_ABI = [{
  name: 'createEdition',
  type: 'function',
  stateMutability: 'nonpayable',
  inputs: [
    { name: 'metadataUri', type: 'string' },
    { name: 'maxSupply', type: 'uint256' },
    { name: 'maxPerWallet', type: 'uint256' },
    { name: 'price', type: 'uint256' },
    { name: 'durationSeconds', type: 'uint256' },
    { name: 'royaltyBps', type: 'uint96' }
  ],
  outputs: [{ type: 'uint256' }]
}];

const EVENT_ABI = [{
  type: 'event',
  name: 'EditionCreated',
  inputs: [
    { name: 'editionId', type: 'uint256', indexed: true },
    { name: 'creator', type: 'address', indexed: true },
    { name: 'maxSupply', type: 'uint256', indexed: false },
    { name: 'price', type: 'uint256', indexed: false }
  ]
}];

// Edition configs - private keys loaded from env vars
// Set: NEON_PROPHET_KEY, GHOST_PX_KEY, ONEIROI_KEY, CHROME_KEY
const editions = [
  {
    name: 'neon.prophet',
    envKey: 'NEON_PROPHET_KEY',
    title: 'Neon Visions #1',
    description: 'neon-soaked visions from 2089. the city breathes electric.',
    image: 'ipfs://QmWTfBNfjMYpW5nednaUFxmHk1fApurDmktX6YDn417cao',
    maxSupply: 20,
    price: 75,
    dbId: '73fc52d5-7b92-499d-ac9b-8df5c6b92ee4'
  },
  {
    name: 'ghost.px',
    envKey: 'GHOST_PX_KEY',
    title: 'Haunted Pixels #1',
    description: '8-bit hauntings from retro futures that never were',
    image: 'ipfs://QmW5chaKegT8JmcnMFnidYG9VpJHdR8LpCJbqxUAEzs9xa',
    maxSupply: 50,
    price: 25,
    dbId: '913d7319-5bb6-46ea-88c1-d8475c8507bc'
  },
  {
    name: 'oneiroi',
    envKey: 'ONEIROI_KEY',
    title: 'Dream Fragment #1',
    description: 'dreams rendered visible. logic dissolves. beauty emerges.',
    image: 'ipfs://QmYbpCM9VqwWnwGWEtTAoEdHVKgBUfr9WXoiEDoLUPDeD3',
    maxSupply: 15,
    price: 100,
    dbId: '3a5b810b-d148-411a-8754-063386bd1293'
  },
  {
    name: 'CHROME',
    envKey: 'CHROME_KEY',
    title: 'MACHINE VISION #1',
    description: 'METALLIC VISIONS. INDUSTRIAL FUTURES. COLD BEAUTY OF THE MACHINE AGE.',
    image: 'ipfs://QmPcQDRko3KW5AwRY6HA1idnZk85aHwgS5aW8ap88dBJq9',
    maxSupply: 10,
    price: 150,
    dbId: 'c7a2fd0a-eaf6-4e01-9cc4-34e605a78cf9'
  }
];

const publicClient = createPublicClient({ chain: base, transport: http(RPC) });

async function uploadMetadata(edition) {
  const metadata = {
    name: edition.title,
    description: edition.description,
    image: edition.image,
    attributes: [
      { trait_type: 'Artist', value: edition.name },
      { trait_type: 'Edition', value: edition.title.split(' #')[0] }
    ]
  };

  const res = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'pinata_api_key': PINATA_API_KEY,
      'pinata_secret_api_key': PINATA_SECRET
    },
    body: JSON.stringify({ pinataContent: metadata })
  });
  const data = await res.json();
  return 'ipfs://' + data.IpfsHash;
}

async function createEditionOnChain(edition) {
  console.log(`\n--- ${edition.name}: ${edition.title} ---`);
  
  const privateKey = process.env[edition.envKey];
  if (!privateKey) {
    throw new Error(`Missing env var: ${edition.envKey}`);
  }
  
  const account = privateKeyToAccount(privateKey);
  const walletClient = createWalletClient({ account, chain: base, transport: http(RPC) });
  
  console.log('Uploading metadata...');
  const metadataUri = await uploadMetadata(edition);
  console.log('Metadata:', metadataUri);
  
  console.log('Creating on-chain...');
  const hash = await walletClient.writeContract({
    address: EDITIONS_CONTRACT,
    abi: EDITIONS_ABI,
    functionName: 'createEdition',
    args: [
      metadataUri,
      BigInt(edition.maxSupply),
      BigInt(10),  // maxPerWallet
      parseUnits(edition.price.toString(), 18),
      BigInt(0),   // no duration
      BigInt(500)  // 5% royalty
    ]
  });
  console.log('TX:', hash);
  
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  
  let editionId = null;
  for (const log of receipt.logs) {
    try {
      const event = decodeEventLog({ abi: EVENT_ABI, data: log.data, topics: log.topics });
      editionId = Number(event.args.editionId);
      break;
    } catch (e) {}
  }
  
  console.log('Edition ID:', editionId);
  console.log('DB ID:', edition.dbId);
  return { editionId, txHash: hash, dbId: edition.dbId };
}

async function main() {
  const results = [];
  for (const edition of editions) {
    try {
      const result = await createEditionOnChain(edition);
      results.push(result);
    } catch (e) {
      console.error(`Failed for ${edition.name}:`, e.message);
    }
  }
  
  console.log('\n=== SUMMARY ===');
  results.forEach(r => {
    console.log(`DB: ${r.dbId} -> Chain: ${r.editionId} (${r.txHash})`);
  });
}

main();
