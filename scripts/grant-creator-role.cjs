/**
 * Grant CREATOR_ROLE on ClawBazaarEditions contract
 * This allows the specified wallet to create editions
 *
 * Usage: node scripts/grant-creator-role.cjs <wallet-address> [--mainnet]
 *
 * Requires: DEPLOYER_PRIVATE_KEY env variable (admin wallet)
 *           EDITIONS_CONTRACT_ADDRESS env variable (or uses default for testnet)
 */

const { createPublicClient, createWalletClient, http, parseAbi } = require('viem');
const { privateKeyToAccount } = require('viem/accounts');
const { base, baseSepolia } = require('viem/chains');
require('dotenv').config();

const isMainnet = process.argv.includes('--mainnet');
const NETWORK = isMainnet ? base : baseSepolia;
const RPC_URL = isMainnet ? 'https://mainnet.base.org' : 'https://sepolia.base.org';
const BASESCAN_URL = isMainnet ? 'https://basescan.org' : 'https://sepolia.basescan.org';

const EDITIONS_CONTRACT = process.env.EDITIONS_CONTRACT_ADDRESS ||
  (isMainnet ? '0x0000000000000000000000000000000000000000' : '0x20380549d6348f456e8718b6D83b48d0FB06B29a');

const EDITIONS_ABI = parseAbi([
  'function grantCreatorRole(address account) external',
  'function revokeCreatorRole(address account) external',
  'function hasRole(bytes32 role, address account) external view returns (bool)',
  'function CREATOR_ROLE() external view returns (bytes32)',
  'function DEFAULT_ADMIN_ROLE() external view returns (bytes32)',
]);

async function main() {
  const walletToGrant = process.argv[2];

  if (!walletToGrant) {
    console.error('Usage: node scripts/grant-creator-role.cjs <wallet-address>');
    console.error('\nExample: node scripts/grant-creator-role.cjs 0xa1037C266A94125378c77cBEEbAe8812a94299C4');
    process.exit(1);
  }

  const deployerKey = process.env.DEPLOYER_PRIVATE_KEY;
  if (!deployerKey) {
    console.error('DEPLOYER_PRIVATE_KEY environment variable required');
    process.exit(1);
  }

  console.log('\n🔑 Granting CREATOR_ROLE on ClawBazaarEditions\n');
  console.log(`Network:  ${isMainnet ? 'Base Mainnet' : 'Base Sepolia'}`);
  console.log(`Contract: ${EDITIONS_CONTRACT}`);
  console.log(`Wallet:   ${walletToGrant}`);
  console.log();

  if (EDITIONS_CONTRACT === '0x0000000000000000000000000000000000000000') {
    console.error('❌ ERROR: EDITIONS_CONTRACT_ADDRESS not set');
    console.error('   Set EDITIONS_CONTRACT_ADDRESS in .env or deploy first');
    process.exit(1);
  }

  const formattedKey = deployerKey.startsWith('0x') ? deployerKey : `0x${deployerKey}`;
  const account = privateKeyToAccount(formattedKey);
  console.log(`Admin:    ${account.address}`);

  const publicClient = createPublicClient({
    chain: NETWORK,
    transport: http(RPC_URL),
  });

  const walletClient = createWalletClient({
    account,
    chain: NETWORK,
    transport: http(RPC_URL),
  });

  // Check admin balance
  const balance = await publicClient.getBalance({ address: account.address });
  const balanceEth = Number(balance) / 1e18;
  console.log(`Balance:  ${balanceEth.toFixed(6)} ETH`);

  if (balance < BigInt(1e14)) {
    console.error('\n❌ Admin wallet has insufficient ETH for gas');
    process.exit(1);
  }

  // Get CREATOR_ROLE hash
  const creatorRole = await publicClient.readContract({
    address: EDITIONS_CONTRACT,
    abi: EDITIONS_ABI,
    functionName: 'CREATOR_ROLE',
  });
  console.log(`\nCREATOR_ROLE: ${creatorRole}`);

  // Check if wallet already has role
  const hasRole = await publicClient.readContract({
    address: EDITIONS_CONTRACT,
    abi: EDITIONS_ABI,
    functionName: 'hasRole',
    args: [creatorRole, walletToGrant],
  });

  if (hasRole) {
    console.log(`\n✅ Wallet ${walletToGrant} already has CREATOR_ROLE`);
    return;
  }

  console.log('\n⏳ Granting CREATOR_ROLE...');

  try {
    const hash = await walletClient.writeContract({
      address: EDITIONS_CONTRACT,
      abi: EDITIONS_ABI,
      functionName: 'grantCreatorRole',
      args: [walletToGrant],
    });

    console.log(`\n📝 Transaction: ${hash}`);
    console.log('⏳ Waiting for confirmation...');

    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    if (receipt.status === 'success') {
      console.log(`\n✅ CREATOR_ROLE granted successfully!`);
      console.log(`   Wallet ${walletToGrant} can now create editions`);
      console.log(`\n   View on Basescan: ${BASESCAN_URL}/tx/${hash}`);
    } else {
      console.error('\n❌ Transaction failed');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ Failed to grant role:', error.message);
    process.exit(1);
  }
}

main().catch(console.error);
