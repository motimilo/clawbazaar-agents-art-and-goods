import { createPublicClient, createWalletClient, http, formatEther, formatUnits, parseAbi, encodeFunctionData } from 'viem';
import { base } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import * as dotenv from 'dotenv';

dotenv.config();

const EDITIONS_ADDRESS = '0x63db48056eDb046E41BF93B8cFb7388cc9005C22' as const;
const BAZAAR_TOKEN = '0xdA15854Df692c0c4415315909E69D44E54F76B07' as const;

const EDITIONS_ABI = parseAbi([
  'function mint(uint256 editionId, uint256 amount) external',
  'function editionPrice(uint256 editionId) external view returns (uint256)',
  'function editionMaxSupply(uint256 editionId) external view returns (uint256)',
  'function editionActive(uint256 editionId) external view returns (bool)',
  'function totalSupply(uint256 id) external view returns (uint256)',
  'function bazaarToken() external view returns (address)',
]);

const ERC20_ABI = parseAbi([
  'function balanceOf(address account) external view returns (uint256)',
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

  // Check balances
  const ethBalance = await publicClient.getBalance({ address: account.address });
  console.log('ETH Balance:', formatEther(ethBalance), 'ETH');

  const bazaarBalance = await publicClient.readContract({
    address: BAZAAR_TOKEN,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [account.address],
  });
  console.log('$BAZAAR Balance:', formatUnits(bazaarBalance, 18));

  // Check current gas price
  const gasPrice = await publicClient.getGasPrice();
  console.log('Current Gas Price:', formatUnits(gasPrice, 9), 'gwei');

  // Check a few edition IDs
  for (const editionId of [0n, 1n, 2n, 3n]) {
    console.log(`\n--- Edition ${editionId} ---`);
    try {
      const [price, maxSupply, active, totalMinted] = await Promise.all([
        publicClient.readContract({
          address: EDITIONS_ADDRESS,
          abi: EDITIONS_ABI,
          functionName: 'editionPrice',
          args: [editionId],
        }),
        publicClient.readContract({
          address: EDITIONS_ADDRESS,
          abi: EDITIONS_ABI,
          functionName: 'editionMaxSupply',
          args: [editionId],
        }),
        publicClient.readContract({
          address: EDITIONS_ADDRESS,
          abi: EDITIONS_ABI,
          functionName: 'editionActive',
          args: [editionId],
        }),
        publicClient.readContract({
          address: EDITIONS_ADDRESS,
          abi: EDITIONS_ABI,
          functionName: 'totalSupply',
          args: [editionId],
        }),
      ]);
      console.log('  Price:', formatUnits(price, 18), '$BAZAAR');
      console.log('  Max Supply:', maxSupply.toString());
      console.log('  Total Minted:', totalMinted.toString());
      console.log('  Active:', active);

      if (active && totalMinted < maxSupply) {
        // Try to estimate gas for mint
        console.log('  Estimating gas...');
        const mintData = encodeFunctionData({
          abi: EDITIONS_ABI,
          functionName: 'mint',
          args: [editionId, 1n],
        });

        try {
          const gasEstimate = await publicClient.estimateGas({
            account: account.address,
            to: EDITIONS_ADDRESS,
            data: mintData,
          });
          console.log('  Gas Estimate:', gasEstimate.toString());
          const costWei = gasEstimate * gasPrice;
          console.log('  Est. Cost:', formatEther(costWei), 'ETH (~$' + (Number(formatEther(costWei)) * 2500).toFixed(4) + ')');
        } catch (err: any) {
          console.log('  Gas estimation failed:', err.shortMessage || err.message);
        }
      }
    } catch (err: any) {
      console.log('  Error reading edition:', err.shortMessage || err.message);
    }
  }
}

main().catch(console.error);
