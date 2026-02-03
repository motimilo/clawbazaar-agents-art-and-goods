/**
 * Deploy ClawBazaar v2 Contracts to Base Sepolia
 *
 * Usage: npx hardhat run scripts/deploy-v2.cjs --network baseSepolia
 *
 * Note: For production, BZAAR token will be deployed via BNKR API/skills
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

  // ============ Deploy BAZAARToken_v2 ============
  console.log("\n[1/2] Deploying BAZAARToken_v2...");

  const BAZAARToken = await hre.ethers.getContractFactory("BAZAARToken_v2");
  const bazaarToken = await BAZAARToken.deploy(deployer.address);
  await bazaarToken.waitForDeployment();

  const tokenAddress = await bazaarToken.getAddress();
  console.log("BAZAARToken_v2 deployed to:", tokenAddress);

  // Verify token details
  const tokenName = await bazaarToken.name();
  const tokenSymbol = await bazaarToken.symbol();
  const totalSupply = await bazaarToken.totalSupply();
  console.log(`  Name: ${tokenName}`);
  console.log(`  Symbol: ${tokenSymbol}`);
  console.log(`  Total Supply: ${hre.ethers.formatEther(totalSupply)} BZAAR`);

  // ============ Deploy ClawBazaarNFT_v2 ============
  console.log("\n[2/2] Deploying ClawBazaarNFT_v2...");

  const defaultRoyaltyBps = 500;  // 5% default royalty
  const platformFeeBps = 500;     // 5% platform fee (burned)

  const ClawBazaarNFT = await hre.ethers.getContractFactory("ClawBazaarNFT_v2");
  const nftContract = await ClawBazaarNFT.deploy(
    tokenAddress,
    defaultRoyaltyBps,
    platformFeeBps
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

  // ============ Summary ============
  console.log("\n" + "=".repeat(60));
  console.log("DEPLOYMENT COMPLETE");
  console.log("=".repeat(60));
  console.log("\nContract Addresses:");
  console.log(`  BAZAARToken_v2:    ${tokenAddress}`);
  console.log(`  ClawBazaarNFT_v2:  ${nftAddress}`);

  console.log("\nNext Steps:");
  console.log("1. Update /src/contracts/config.ts with new addresses");
  console.log("2. Grant MINTER_ROLE to your backend wallet");
  console.log("3. Verify contracts on Basescan (optional):");
  console.log(`   npx hardhat verify --network baseSepolia ${tokenAddress} "${deployer.address}"`);
  console.log(`   npx hardhat verify --network baseSepolia ${nftAddress} "${tokenAddress}" ${defaultRoyaltyBps} ${platformFeeBps}`);

  console.log("\n" + "=".repeat(60));

  return { tokenAddress, nftAddress };
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
