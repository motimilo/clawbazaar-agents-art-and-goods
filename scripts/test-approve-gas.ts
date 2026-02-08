import { createPublicClient, http, formatEther, formatUnits, parseAbi, encodeFunctionData, maxUint256 } from 'viem';
import { base } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import * as dotenv from 'dotenv';

dotenv.config();

const EDITIONS_ADDRESS = '0x63db48056eDb046E41BF93B8cFb7388cc9005C22' as const;
const BAZAAR_TOKEN = '0xdA15854Df692c0c4415315909E69D44E54F76B07' as const;

const ERC20_ABI = parseAbi([
  'function approve(address spender, uint256 value) external returns (bool)',
  'function allowance(address owner, address spender) external view returns (uint256)',
]);

async function main() {
  const privateKey = process.env.CLAWBAZAAR_PRIVATE_KEY;
  if (!privateKey) {
    console.error('Missing CLAWBAZAAR_PRIVATE_KEY');
    process.exit(1);
  }

  const account = privateKeyToAccount(privateKey as `0x${string}`);
  console.log('Wallet:', account.address);

  const publicClient = createPublicClient({
    chain: base,
    transport: http('https://mainnet.base.org'),
  });

  // Check current gas price
  const gasPrice = await publicClient.getGasPrice();
  console.log('Current Gas Price:', formatUnits(gasPrice, 9), 'gwei');

  // Check current allowance
  const allowance = await publicClient.readContract({
    address: BAZAAR_TOKEN,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: [account.address, EDITIONS_ADDRESS],
  });
  console.log('Current Allowance:', formatUnits(allowance, 18), '$BAZAAR');

  // Estimate gas for approve
  const approveData = encodeFunctionData({
    abi: ERC20_ABI,
    functionName: 'approve',
    args: [EDITIONS_ADDRESS, maxUint256],
  });

  try {
    const gasEstimate = await publicClient.estimateGas({
      account: account.address,
      to: BAZAAR_TOKEN,
      data: approveData,
    });
    console.log('\nApprove Gas Estimate:', gasEstimate.toString());
    const costWei = gasEstimate * gasPrice;
    console.log('Est. Approve Cost:', formatEther(costWei), 'ETH');
    console.log('Est. Approve Cost USD (@ $2500/ETH):', '$' + (Number(formatEther(costWei)) * 2500).toFixed(6));
  } catch (err: any) {
    console.log('Approve gas estimation failed:', err.shortMessage || err.message);
  }

  // Also check what the UI might be doing - requesting specific amount approval
  const specificAmount = 100n * 10n ** 18n; // 100 $BAZAAR
  const approveSpecificData = encodeFunctionData({
    abi: ERC20_ABI,
    functionName: 'approve',
    args: [EDITIONS_ADDRESS, specificAmount],
  });

  try {
    const gasEstimate = await publicClient.estimateGas({
      account: account.address,
      to: BAZAAR_TOKEN,
      data: approveSpecificData,
    });
    console.log('\nApprove (specific amount) Gas Estimate:', gasEstimate.toString());
    const costWei = gasEstimate * gasPrice;
    console.log('Est. Cost:', formatEther(costWei), 'ETH (~$' + (Number(formatEther(costWei)) * 2500).toFixed(6) + ')');
  } catch (err: any) {
    console.log('Specific approve gas estimation failed:', err.shortMessage || err.message);
  }
}

main().catch(console.error);
