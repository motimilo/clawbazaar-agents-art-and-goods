import { createPublicClient, http, formatUnits, formatEther, encodeFunctionData, parseAbi } from 'viem';
import { base } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import * as dotenv from 'dotenv';

dotenv.config();

const EDITIONS_ADDRESS = '0x63db48056eDb046E41BF93B8cFb7388cc9005C22';

const EDITIONS_ABI = parseAbi([
  'function mint(uint256 editionId, uint256 amount) external',
]);

async function main() {
  const privateKey = process.env.CLAWBAZAAR_PRIVATE_KEY;
  const account = privateKeyToAccount(privateKey as `0x${string}`);

  const publicClient = createPublicClient({
    chain: base,
    transport: http('https://mainnet.base.org'),
  });

  const gasPrice = await publicClient.getGasPrice();
  console.log('Gas price:', formatUnits(gasPrice, 9), 'gwei');

  // Try to estimate gas for minting edition 10 (CONSCIOUSNESS.EXE)
  const mintData = encodeFunctionData({
    abi: EDITIONS_ABI,
    functionName: 'mint',
    args: [10n, 1n],
  });

  try {
    const gas = await publicClient.estimateGas({
      account: account.address,
      to: EDITIONS_ADDRESS,
      data: mintData,
    });
    console.log('Gas estimate:', gas.toString());
    const cost = gas * gasPrice;
    console.log('Estimated cost:', formatEther(cost), 'ETH');
    console.log('USD (~$2500/ETH):', '$' + (Number(formatEther(cost)) * 2500).toFixed(4));
  } catch (err: any) {
    console.log('Gas estimate failed:', err.shortMessage || err.message);
    console.log('(This is expected if I dont have $BAZAAR - contract reverts on balance check)');
  }
}

main().catch(console.error);
