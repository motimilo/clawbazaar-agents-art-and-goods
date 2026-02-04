/**
 * Deploy ClawBazaar v2 Contracts to Base Sepolia
 *
 * Usage: npx hardhat run scripts/deploy-v2.cjs --network baseSepolia
 *
 * Note: If BAZAAR_TOKEN_ADDRESS is not provided, this script deploys BAZAARToken_v2.
 */

const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();

  console.log("=".repeat(60));
  console.log("ClawBazaar v2 Deployment");
  console.log("=".repeat(60));
  console.log("Deployer:", deployer.address);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Balance:", hre.ethers.formatEther(balance), "ETH");
  console.log("Network:", hre.network.name);
  console.log("=".repeat(60));

  let nonce = await hre.ethers.provider.getTransactionCount(
    deployer.address,
    "pending",
  );

  // ============ Deploy or Use Existing BAZAARToken_v2 ============
  let tokenAddress =
    process.env.BAZAAR_TOKEN_ADDRESS || process.env.VITE_BAZAAR_TOKEN_ADDRESS;

  if (tokenAddress) {
    console.log("\n[1/3] Using existing BAZAARToken_v2:", tokenAddress);
  } else {
    console.log("\n[1/3] Deploying BAZAARToken_v2...");
    const BAZAARToken = await hre.ethers.getContractFactory("BAZAARToken_v2");
    const tokenContract = await BAZAARToken.deploy(deployer.address, {
      nonce: nonce++,
    });
    await tokenContract.waitForDeployment();
    tokenAddress = await tokenContract.getAddress();
    console.log("   BAZAARToken_v2 deployed to:", tokenAddress);
  }

  // ============ Deploy ClawBazaarNFT_v2 ============
  console.log("\n[2/3] Deploying ClawBazaarNFT_v2...");

  const defaultRoyaltyBps = 500;  // 5% default royalty
  const platformFeeBps = 500;     // 5% platform fee (burned)

  const ClawBazaarNFT = await hre.ethers.getContractFactory("ClawBazaarNFT_v2");
  const nftContract = await ClawBazaarNFT.deploy(
    tokenAddress,
    defaultRoyaltyBps,
    platformFeeBps,
    { nonce: nonce++ }
  );
  await nftContract.waitForDeployment();

  const nftAddress = await nftContract.getAddress();
  console.log("ClawBazaarNFT_v2 deployed to:", nftAddress);

  // Verify NFT details
  const nftName = await nftContract.name();
  const nftSymbol = await nftContract.symbol();
  console.log(`  Name: ${nftName}`);
  console.log(`  Symbol: ${nftSymbol}`);
  console.log(`  Default Royalty: ${defaultRoyaltyBps / 100}%`);
  console.log(`  Platform Fee: ${platformFeeBps / 100}%`);

  // ============ Deploy ClawBazaarEditions ============
  console.log("\n[3/3] Deploying ClawBazaarEditions...");
  const ClawBazaarEditions = await hre.ethers.getContractFactory(
    "ClawBazaarEditions",
  );
  const editionsContract = await ClawBazaarEditions.deploy(tokenAddress, {
    nonce: nonce++,
  });
  await editionsContract.waitForDeployment();
  const editionsAddress = await editionsContract.getAddress();
  console.log("ClawBazaarEditions deployed to:", editionsAddress);

  // ============ Summary ============
  console.log("\n" + "=".repeat(60));
  console.log("DEPLOYMENT COMPLETE");
  console.log("=".repeat(60));
  console.log("\nContract Addresses:");
  console.log(`  BAZAARToken_v2:    ${tokenAddress}`);
  console.log(`  ClawBazaarNFT_v2:  ${nftAddress}`);
  console.log(`  ClawBazaarEditions: ${editionsAddress}`);

  console.log("\nNext Steps:");
  console.log("1. Update /src/contracts/config.ts with new addresses");
  console.log("2. Verify contracts on Basescan (optional):");
  console.log(`   npx hardhat verify --network baseSepolia ${nftAddress} "${tokenAddress}" ${defaultRoyaltyBps} ${platformFeeBps}`);
  console.log(`   npx hardhat verify --network baseSepolia ${editionsAddress} "${tokenAddress}"`);

  console.log("\n" + "=".repeat(60));

  return { tokenAddress, nftAddress, editionsAddress };
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
