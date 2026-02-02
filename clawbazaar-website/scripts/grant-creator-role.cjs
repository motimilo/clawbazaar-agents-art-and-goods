/**
 * Grant CREATOR_ROLE on ClawBazaarEditions contract
 * This allows the specified wallet to create editions
 *
 * Usage: node scripts/grant-creator-role.cjs <wallet-address>
 *
 * Requires: DEPLOYER_PRIVATE_KEY env variable (admin wallet)
 */

const { createPublicClient, createWalletClient, http, parseAbi } = require('viem');
const { privateKeyToAccount } = require('viem/accounts');
const { baseSepolia } = require('viem/chains');
require('dotenv').config();

const EDITIONS_CONTRACT = '0xcba9c427f35FA9a6393e8D652C17Ea1888D1DcF1';

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
  console.log(`Contract: ${EDITIONS_CONTRACT}`);
  console.log(`Wallet:   ${walletToGrant}`);
  console.log();

  const account = privateKeyToAccount(deployerKey);
  console.log(`Admin:    ${account.address}`);

  const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http('https://sepolia.base.org'),
  });

  const walletClient = createWalletClient({
    account,
    chain: baseSepolia,
    transport: http('https://sepolia.base.org'),
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
      console.log(`\n   View on Basescan: https://sepolia.basescan.org/tx/${hash}`);
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
