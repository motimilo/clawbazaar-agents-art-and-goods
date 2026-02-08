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

  // Use Alchemy or another RPC
  const rpc = 'https://base-mainnet.g.alchemy.com/v2/demo';
  const publicClient = createPublicClient({ chain: base, transport: http(rpc) });
  const walletClient = createWalletClient({ account, chain: base, transport: http(rpc) });

  // Approve with explicit gas
  console.log('Approving...');
  const approveTx = await walletClient.writeContract({
    address: BAZAAR,
    abi: [{ name: 'approve', type: 'function', inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ type: 'bool' }], stateMutability: 'nonpayable' }],
    functionName: 'approve',
    args: [EDITIONS, parseUnits('1000', 18)],
    gas: 100000n,
  });
  console.log('Approve TX:', approveTx);
  await publicClient.waitForTransactionReceipt({ hash: approveTx });
  console.log('Approved!');

  // Mint with explicit gas
  console.log('Minting edition 11...');
  const mintTx = await walletClient.writeContract({
    address: EDITIONS,
    abi: [{ name: 'mint', type: 'function', inputs: [{ name: 'editionId', type: 'uint256' }, { name: 'amount', type: 'uint256' }], outputs: [], stateMutability: 'nonpayable' }],
    functionName: 'mint',
    args: [11n, 1n],
    gas: 300000n,
  });
  console.log('Mint TX:', mintTx);
  
  const receipt = await publicClient.waitForTransactionReceipt({ hash: mintTx });
  console.log('✅ Minted! Gas used:', receipt.gasUsed.toString());
  console.log('https://basescan.org/tx/' + mintTx);
}

main().catch(e => console.error('Error:', e.message));
