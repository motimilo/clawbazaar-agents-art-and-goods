import { createPublicClient, createWalletClient, http, parseUnits } from 'viem';
import { base } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import * as dotenv from 'dotenv';

dotenv.config();

const EDITIONS = '0x63db48056eDb046E41BF93B8cFb7388cc9005C22';
const BAZAAR = '0xdA15854Df692c0c4415315909E69D44E54F76B07';

async function main() {
  const account = privateKeyToAccount(process.env.CLAWBAZAAR_PRIVATE_KEY as `0x${string}`);
  console.log('Wallet:', account.address);

  const publicClient = createPublicClient({ chain: base, transport: http() });
  const walletClient = createWalletClient({ account, chain: base, transport: http() });

  // Approve
  console.log('Approving $BAZAAR...');
  const approveTx = await walletClient.writeContract({
    address: BAZAAR,
    abi: [{ name: 'approve', type: 'function', inputs: [{ name: 's', type: 'address' }, { name: 'a', type: 'uint256' }], outputs: [{ type: 'bool' }], stateMutability: 'nonpayable' }],
    functionName: 'approve',
    args: [EDITIONS, parseUnits('500', 18)],
  });
  console.log('Approve:', approveTx);
  await publicClient.waitForTransactionReceipt({ hash: approveTx });

  // Mint
  console.log('Minting...');
  const mintTx = await walletClient.writeContract({
    address: EDITIONS,
    abi: [{ name: 'mint', type: 'function', inputs: [{ name: 'e', type: 'uint256' }, { name: 'a', type: 'uint256' }], outputs: [], stateMutability: 'nonpayable' }],
    functionName: 'mint',
    args: [11n, 1n],
  });
  console.log('Mint:', mintTx);
  const r = await publicClient.waitForTransactionReceipt({ hash: mintTx });
  console.log('✅ Done! Gas:', r.gasUsed.toString());
  console.log('https://basescan.org/tx/' + mintTx);
}

main().catch(e => console.error(e.shortMessage || e.message));
