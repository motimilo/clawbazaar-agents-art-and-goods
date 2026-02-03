const { createPublicClient, createWalletClient, http, parseAbi, formatEther } = require('viem');
const { privateKeyToAccount } = require('viem/accounts');
const { baseSepolia } = require('viem/chains');
require('dotenv').config();

const BAZAAR_TOKEN_ADDRESS = '0xda15854df692c0c4415315909e69d44e54f76b07';
const RPC_URL = 'https://sepolia.base.org';
const DEPLOYER_KEY = process.env.DEPLOYER_PRIVATE_KEY;

const ERC20_ABI = parseAbi([
  'function balanceOf(address account) external view returns (uint256)',
  'function transfer(address to, uint256 amount) external returns (bool)',
  'function decimals() external view returns (uint8)',
  'function symbol() external view returns (string)',
]);

async function distributeTokens() {
  console.log('BAZAAR Token Distribution Tool\n');

  if (!DEPLOYER_KEY) {
    console.error('DEPLOYER_PRIVATE_KEY not found in .env');
    process.exit(1);
  }

  const account = privateKeyToAccount(DEPLOYER_KEY);
  console.log('Distributor:', account.address);

  const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(RPC_URL),
  });

  const walletClient = createWalletClient({
    account,
    chain: baseSepolia,
    transport: http(RPC_URL),
  });

  const balance = await publicClient.readContract({
    address: BAZAAR_TOKEN_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [account.address],
  });

  const symbol = await publicClient.readContract({
    address: BAZAAR_TOKEN_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'symbol',
  });

  console.log(`Current Balance: ${formatEther(balance)} ${symbol}\n`);

  const recipientAddress = process.argv[2];
  const amountStr = process.argv[3] || '1000';

  if (!recipientAddress) {
    console.log('Usage: node scripts/distribute-tokens.cjs <recipient-address> [amount]');
    console.log('\nExample:');
    console.log('  node scripts/distribute-tokens.cjs 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb 1000');
    console.log('\nThis will send 1000 BAZAAR tokens to the recipient');
    process.exit(0);
  }

  const amount = BigInt(Math.floor(parseFloat(amountStr) * 1e18));

  if (balance < amount) {
    console.error(`Insufficient balance. Have ${formatEther(balance)} ${symbol}, need ${amountStr}`);
    process.exit(1);
  }

  console.log(`Sending ${amountStr} ${symbol} to ${recipientAddress}...`);

  const hash = await walletClient.writeContract({
    address: BAZAAR_TOKEN_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'transfer',
    args: [recipientAddress, amount],
  });

  console.log('   TX Hash:', hash);
  console.log('   Waiting for confirmation...\n');

  await publicClient.waitForTransactionReceipt({ hash });

  const recipientBalance = await publicClient.readContract({
    address: BAZAAR_TOKEN_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [recipientAddress],
  });

  console.log('Transfer successful!');
  console.log(`   Recipient balance: ${formatEther(recipientBalance)} ${symbol}`);
  console.log(`   View on BaseScan: https://sepolia.basescan.org/tx/${hash}`);
}

distributeTokens().catch(console.error);
