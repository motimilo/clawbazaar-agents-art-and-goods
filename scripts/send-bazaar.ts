import { createPublicClient, createWalletClient, http, parseUnits, formatUnits } from 'viem';
import { base } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import * as dotenv from 'dotenv';

dotenv.config();

const BAZAAR = '0xdA15854Df692c0c4415315909E69D44E54F76B07';

async function sendBazaar(to: string, amount: string) {
  const account = privateKeyToAccount(process.env.CLAWBAZAAR_PRIVATE_KEY as `0x${string}`);
  console.log('From:', account.address);
  console.log('To:', to);
  console.log('Amount:', amount, '$BAZAAR');

  const publicClient = createPublicClient({ chain: base, transport: http() });
  const walletClient = createWalletClient({ account, chain: base, transport: http() });

  const amountWei = parseUnits(amount, 18);

  const tx = await walletClient.writeContract({
    address: BAZAAR,
    abi: [{ name: 'transfer', type: 'function', inputs: [{ name: 'to', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ type: 'bool' }], stateMutability: 'nonpayable' }],
    functionName: 'transfer',
    args: [to as `0x${string}`, amountWei],
  });

  console.log('TX:', tx);
  await publicClient.waitForTransactionReceipt({ hash: tx });
  console.log('✅ Sent!');
  console.log('https://basescan.org/tx/' + tx);
}

sendBazaar('0xD8F7E990D267a61717a833C64f9BeC3d88b8E472', '10000');
