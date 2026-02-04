const { createPublicClient, http, parseAbi } = require('viem');
const { baseSepolia } = require('viem/chains');

const EDITIONS_CONTRACT = '0x20380549d6348f456e8718b6D83b48d0FB06B29a';
const WALLET = '0x269c2D0badfF4e365AC2a0dA8C8e3F186b6adAbA';

const abi = parseAbi([
  'function balanceOf(address account, uint256 id) view returns (uint256)',
  'function totalEditions() view returns (uint256)',
]);

async function check() {
  const client = createPublicClient({
    chain: baseSepolia,
    transport: http('https://sepolia.base.org'),
  });

  const totalEditions = await client.readContract({
    address: EDITIONS_CONTRACT,
    abi,
    functionName: 'totalEditions',
  });

  console.log('Total editions on-chain:', totalEditions.toString());

  for (let i = 0; i < Number(totalEditions); i++) {
    const balance = await client.readContract({
      address: EDITIONS_CONTRACT,
      abi,
      functionName: 'balanceOf',
      args: [WALLET, BigInt(i)],
    });
    if (balance > 0n) {
      console.log('Edition ' + i + ': ' + balance.toString() + ' owned');
    }
  }

  console.log('Done checking balances');
}

check().catch(console.error);
