import { createPublicClient, createWalletClient, http, formatEther, formatUnits, parseAbi } from 'viem';
import { base } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import * as dotenv from 'dotenv';

dotenv.config();

const EDITIONS_ADDRESS = '0x63db48056eDb046E41BF93B8cFb7388cc9005C22';
const BAZAAR_TOKEN = '0xdA15854Df692c0c4415315909E69D44E54F76B07';

const EDITIONS_ABI = parseAbi([
  'function mint(uint256 editionId, uint256 amount) external',
  'function editionPrice(uint256 editionId) external view returns (uint256)',
  'function editions(uint256) external view returns (string metadataUri, address creator, uint256 maxSupply, uint256 totalMinted, uint256 maxPerWallet, uint256 price, uint256 endTime, uint96 royaltyBps, bool exists)',
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

  // Try to estimate gas for minting edition 0 (Day Zero)
  const editionId = 0n;
  try {
    const editionInfo = await publicClient.readContract({
      address: EDITIONS_ADDRESS,
      abi: EDITIONS_ABI,
      functionName: 'editions',
      args: [editionId],
    });
    console.log('\nEdition 0 info:');
    console.log('  Max Supply:', editionInfo[2].toString());
    console.log('  Total Minted:', editionInfo[3].toString());
    console.log('  Price:', formatUnits(editionInfo[5], 18), '$BAZAAR');

    // Check allowance
    const allowance = await publicClient.readContract({
      address: BAZAAR_TOKEN,
      abi: ERC20_ABI,
      functionName: 'allowance',
      args: [account.address, EDITIONS_ADDRESS],
    });
    console.log('  Current Allowance:', formatUnits(allowance, 18), '$BAZAAR');

    // Estimate gas for mint
    const gasEstimate = await publicClient.estimateGas({
      account: account.address,
      to: EDITIONS_ADDRESS,
      data: '0x' + 'a0712d68' + editionId.toString(16).padStart(64, '0') + (1n).toString(16).padStart(64, '0'), // mint(uint256,uint256) selector
    });
    console.log('\nGas Estimate for mint:', gasEstimate.toString());
    
    const estimatedCostWei = gasEstimate * gasPrice;
    console.log('Estimated cost:', formatEther(estimatedCostWei), 'ETH');
    console.log('Estimated cost USD (@ $2500/ETH):', (Number(formatEther(estimatedCostWei)) * 2500).toFixed(4));

  } catch (err) {
    console.error('Error:', err);
  }
}

main().catch(console.error);
