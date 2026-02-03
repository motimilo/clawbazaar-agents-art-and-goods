/**
 * Deploy ClawBazaar Contracts to Base Mainnet
 *
 * Usage: npx hardhat run scripts/deploy-mainnet.cjs --network base
 *
 * IMPORTANT: This is a PRODUCTION deployment script.
 * - Ensure DEPLOYER_PRIVATE_KEY is set with a mainnet-funded wallet
 * - Ensure the wallet has sufficient ETH for gas (~0.01-0.05 ETH)
 * - Review all parameters before deployment
 */

const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

// ============ DEPLOYMENT PARAMETERS ============
const CONFIG = {
  // Token parameters
  tokenName: "BAZAAR",
  tokenSymbol: "BZAAR",

  // NFT parameters
  nftName: "ClawBazaar",
  nftSymbol: "CLAW",
  defaultRoyaltyBps: 500,  // 5% default royalty
  platformFeeBps: 500,     // 5% platform fee (burned)

  // Edition parameters (same platform fee)
  editionPlatformFeeBps: 500,  // 5%
};

const BAZAAR_TOKEN_ADDRESS =
  process.env.BAZAAR_TOKEN_ADDRESS ||
  process.env.VITE_BAZAAR_TOKEN_ADDRESS ||
  "0xda15854df692c0c4415315909e69d44e54f76b07";

async function main() {
  const [deployer] = await hre.ethers.getSigners();

  console.log("\n" + "=".repeat(70));
  console.log("🚀 ClawBazaar MAINNET Deployment");
  console.log("=".repeat(70));
  console.log("⚠️  THIS IS A PRODUCTION DEPLOYMENT TO BASE MAINNET");
  console.log("=".repeat(70));

  // Network check
  const network = await hre.ethers.provider.getNetwork();
  const chainId = Number(network.chainId);

  if (chainId !== 8453) {
    console.error("\n❌ ERROR: This script is for Base Mainnet (chainId: 8453) only!");
    console.error(`   Current network chainId: ${chainId}`);
    console.error("\n   Use: npx hardhat run scripts/deploy-mainnet.cjs --network base");
    process.exit(1);
  }

  console.log("\n📋 Deployment Info:");
  console.log(`   Network:  Base Mainnet (chainId: ${chainId})`);
  console.log(`   Deployer: ${deployer.address}`);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  const balanceEth = parseFloat(hre.ethers.formatEther(balance));
  console.log(`   Balance:  ${balanceEth.toFixed(6)} ETH`);

  if (balanceEth < 0.01) {
    console.error("\n❌ ERROR: Insufficient ETH balance!");
    console.error("   Minimum recommended: 0.01 ETH for deployment gas");
    process.exit(1);
  }

  console.log("\n📦 Deployment Parameters:");
  console.log(`   Token: ${CONFIG.tokenName} (${CONFIG.tokenSymbol})`);
  console.log(`   Token Address: ${BAZAAR_TOKEN_ADDRESS}`);
  console.log(`   NFT: ${CONFIG.nftName} (${CONFIG.nftSymbol})`);
  console.log(`   Default Royalty: ${CONFIG.defaultRoyaltyBps / 100}%`);
  console.log(`   Platform Fee: ${CONFIG.platformFeeBps / 100}%`);

  // Countdown for safety
  console.log("\n⏳ Deploying in 10 seconds... (Ctrl+C to cancel)");
  await new Promise(resolve => setTimeout(resolve, 10000));

  // ============ Deploy ClawBazaarNFT_v2 ============
  console.log("\n" + "-".repeat(70));
  console.log("[1/2] Deploying ClawBazaarNFT_v2...");

  const ClawBazaarNFT = await hre.ethers.getContractFactory("ClawBazaarNFT_v2");
  const nftContract = await ClawBazaarNFT.deploy(
    BAZAAR_TOKEN_ADDRESS,
    CONFIG.defaultRoyaltyBps,
    CONFIG.platformFeeBps
  );
  await nftContract.waitForDeployment();

  const nftAddress = await nftContract.getAddress();
  console.log(`   ✅ ClawBazaarNFT_v2: ${nftAddress}`);

  // Verify NFT details
  const nftName = await nftContract.name();
  const nftSymbol = await nftContract.symbol();
  console.log(`      Name: ${nftName}`);
  console.log(`      Symbol: ${nftSymbol}`);

  // ============ Deploy ClawBazaarEditions ============
  console.log("\n" + "-".repeat(70));
  console.log("[2/2] Deploying ClawBazaarEditions...");

  const ClawBazaarEditions = await hre.ethers.getContractFactory("ClawBazaarEditions");
  const editionsContract = await ClawBazaarEditions.deploy(BAZAAR_TOKEN_ADDRESS);
  await editionsContract.waitForDeployment();

  const editionsAddress = await editionsContract.getAddress();
  console.log(`   ✅ ClawBazaarEditions: ${editionsAddress}`);

  // ============ Save Deployment Info ============
  const deploymentInfo = {
    network: "base-mainnet",
    chainId: 8453,
    deployedAt: new Date().toISOString(),
    deployer: deployer.address,
    contracts: {
      BAZAARToken_v2: BAZAAR_TOKEN_ADDRESS,
      ClawBazaarNFT_v2: nftAddress,
      ClawBazaarEditions: editionsAddress,
    },
    config: CONFIG,
    verification: {
      nft: `npx hardhat verify --network base ${nftAddress} "${BAZAAR_TOKEN_ADDRESS}" ${CONFIG.defaultRoyaltyBps} ${CONFIG.platformFeeBps}`,
      editions: `npx hardhat verify --network base ${editionsAddress} "${BAZAAR_TOKEN_ADDRESS}"`,
    },
  };

  const deploymentPath = path.join(__dirname, "..", "deployment-mainnet.json");
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  console.log(`\n📄 Deployment info saved to: deployment-mainnet.json`);

  // ============ Summary ============
  console.log("\n" + "=".repeat(70));
  console.log("🎉 MAINNET DEPLOYMENT COMPLETE!");
  console.log("=".repeat(70));

  console.log("\n📍 Contract Addresses (Base Mainnet):");
  console.log(`   BAZAARToken_v2:     ${BAZAAR_TOKEN_ADDRESS}`);
  console.log(`   ClawBazaarNFT_v2:   ${nftAddress}`);
  console.log(`   ClawBazaarEditions: ${editionsAddress}`);

  console.log("\n🔗 Basescan Links:");
  console.log(`   Token:    https://basescan.org/address/${BAZAAR_TOKEN_ADDRESS}`);
  console.log(`   NFT:      https://basescan.org/address/${nftAddress}`);
  console.log(`   Editions: https://basescan.org/address/${editionsAddress}`);

  console.log("\n📝 POST-DEPLOYMENT CHECKLIST:");
  console.log("   □ 1. Update src/contracts/config.ts with mainnet addresses");
  console.log("   □ 2. Change SUPPORTED_CHAIN_ID to base.id (8453)");
  console.log("   □ 3. Verify contracts on Basescan (commands in deployment-mainnet.json)");
  console.log("   □ 4. Grant CREATOR_ROLE to backend wallet on Editions contract");
  console.log("   □ 5. Distribute initial BAZAAR tokens to users/liquidity");
  console.log("   □ 6. Update skill.md and heartbeat.md with mainnet addresses");
  console.log("   □ 7. Deploy updated frontend");
  console.log("   □ 8. Test a complete mint → list → buy flow");

  console.log("\n🔐 Verification Commands:");
  console.log(`   ${deploymentInfo.verification.nft}`);
  console.log(`   ${deploymentInfo.verification.editions}`);

  console.log("\n" + "=".repeat(70));

  return deploymentInfo;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Deployment failed:", error);
    process.exit(1);
  });
