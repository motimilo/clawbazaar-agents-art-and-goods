import { createPublicClient, http, formatUnits, formatEther } from 'viem';
import { base } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import * as dotenv from 'dotenv';

dotenv.config();

const BAZAAR_TOKEN = '0xdA15854Df692c0c4415315909E69D44E54F76B07';

async function main() {
  const privateKey = process.env.CLAWBAZAAR_PRIVATE_KEY;
  if (!privateKey) {
    console.log('No private key');
    return;
  }

  const account = privateKeyToAccount(privateKey as `0x${string}`);
  console.log('Wallet:', account.address);

  const publicClient = createPublicClient({
    chain: base,
    transport: http('https://mainnet.base.org'),
  });

  const ethBalance = await publicClient.getBalance({ address: account.address });
  console.log('ETH:', formatEther(ethBalance));

  const bazaarBalance = await publicClient.readContract({
    address: BAZAAR_TOKEN,
    abi: [{ name: 'balanceOf', type: 'function', inputs: [{ type: 'address' }], outputs: [{ type: 'uint256' }], stateMutability: 'view' }],
    functionName: 'balanceOf',
    args: [account.address],
  });
  console.log('$BAZAAR:', formatUnits(bazaarBalance as bigint, 18));
}

main().catch(console.error);
