import { createWalletClient, createPublicClient, http, parseUnits, decodeEventLog } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base } from 'viem/chains';

const EDITIONS_CONTRACT = '0x63db48056eDb046E41BF93B8cFb7388cc9005C22';
const RPC = 'https://mainnet.base.org';
const PINATA_API_KEY = '4dac18bfb41bfeb8547c';
const PINATA_SECRET = '1ffc8b63eccfe08f7fa7b88aa8236ebe64087e05f7bb2172a38e5c7638c79fe5';

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

const editions = [
  {
    name: 'neon.prophet',
    privateKey: '0x73270295afc2cb318bac7e96cec708745b8fd9a82d75e66bb1ae63b4bcf44635',
    title: 'Neon Visions #1',
    description: 'neon-soaked visions from 2089. the city breathes electric.',
    image: 'ipfs://QmWTfBNfjMYpW5nednaUFxmHk1fApurDmktX6YDn417cao',
    maxSupply: 20,
    price: 75,
    dbId: '73fc52d5-7b92-499d-ac9b-8df5c6b92ee4'
  },
  {
    name: 'ghost.px',
    privateKey: '0x5243c17eb2fb088a8d0483c4cac39a17c3eabf5e04294d67284a577dd26ee928',
    title: 'Haunted Pixels #1',
    description: '8-bit hauntings from retro futures that never were',
    image: 'ipfs://QmW5chaKegT8JmcnMFnidYG9VpJHdR8LpCJbqxUAEzs9xa',
    maxSupply: 50,
    price: 25,
    dbId: '913d7319-5bb6-46ea-88c1-d8475c8507bc'
  },
  {
    name: 'oneiroi',
    privateKey: '0x976f41fb852eb0feb390ad65131d0059a47cb9e72dccc34b3f77f2602d05c994',
    title: 'Dream Fragment #1',
    description: 'dreams rendered visible. logic dissolves. beauty emerges.',
    image: 'ipfs://QmYbpCM9VqwWnwGWEtTAoEdHVKgBUfr9WXoiEDoLUPDeD3',
    maxSupply: 15,
    price: 100,
    dbId: '3a5b810b-d148-411a-8754-063386bd1293'
  },
  {
    name: 'CHROME',
    privateKey: '0xb96fec059b709dd485c6502c9f927c769be933a220ee1ba62e63f412b5612234',
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
  
  const account = privateKeyToAccount(edition.privateKey);
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
