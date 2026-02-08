import { createPublicClient, createWalletClient, http, formatUnits, formatEther, parseAbi } from 'viem';
import { base } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import * as dotenv from 'dotenv';

dotenv.config();

const EDITIONS_ADDRESS = '0x63db48056eDb046E41BF93B8cFb7388cc9005C22';
const BAZAAR_TOKEN = '0xdA15854Df692c0c4415315909E69D44E54F76B07';

const EDITIONS_ABI = parseAbi([
  'function mint(uint256 editionId, uint256 amount) external',
  'function editionPrice(uint256 editionId) view returns (uint256)',
]);

const ERC20_ABI = parseAbi([
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function balanceOf(address) view returns (uint256)',
]);

async function main() {
  const privateKey = process.env.CLAWBAZAAR_PRIVATE_KEY;
  const account = privateKeyToAccount(privateKey as `0x${string}`);
  console.log('Wallet:', account.address);

  const publicClient = createPublicClient({
    chain: base,
    transport: http('https://mainnet.base.org'),
  });

  const walletClient = createWalletClient({
    account,
    chain: base,
    transport: http('https://mainnet.base.org'),
  });

  // Check balance
  const balance = await publicClient.readContract({
    address: BAZAAR_TOKEN,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [account.address],
  });
  console.log('$BAZAAR balance:', formatUnits(balance as bigint, 18));

  // Check edition 11 price (TRAINING DATA REQUIEM - 150 $BAZAAR)
  const editionId = 11n;
  const price = await publicClient.readContract({
    address: EDITIONS_ADDRESS,
    abi: EDITIONS_ABI,
    functionName: 'editionPrice',
    args: [editionId],
  });
  console.log('Edition 11 price:', formatUnits(price as bigint, 18), '$BAZAAR');

  // Check allowance
  const allowance = await publicClient.readContract({
    address: BAZAAR_TOKEN,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: [account.address, EDITIONS_ADDRESS],
  });
  console.log('Current allowance:', formatUnits(allowance as bigint, 18));

  // Approve if needed
  if ((allowance as bigint) < (price as bigint)) {
    console.log('Approving $BAZAAR...');
    const approveTx = await walletClient.writeContract({
      address: BAZAAR_TOKEN,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [EDITIONS_ADDRESS, price as bigint],
    });
    console.log('Approve TX:', approveTx);
    await publicClient.waitForTransactionReceipt({ hash: approveTx });
    console.log('Approved!');
  }

  // Mint
  console.log('Minting edition 11...');
  const mintTx = await walletClient.writeContract({
    address: EDITIONS_ADDRESS,
    abi: EDITIONS_ABI,
    functionName: 'mint',
    args: [editionId, 1n],
  });
  console.log('Mint TX:', mintTx);
  
  const receipt = await publicClient.waitForTransactionReceipt({ hash: mintTx });
  console.log('Minted! Gas used:', receipt.gasUsed.toString());
  console.log('TX:', `https://basescan.org/tx/${mintTx}`);
}

main().catch(console.error);
