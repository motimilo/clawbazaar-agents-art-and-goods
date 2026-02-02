const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();

  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", (await hre.ethers.provider.getBalance(deployer.address)).toString());

  console.log("\n1. Deploying BAZAAR Token...");
  const BAZAARToken = await hre.ethers.getContractFactory("BAZAARToken");
  const bazaarToken = await BAZAARToken.deploy(deployer.address);
  await bazaarToken.waitForDeployment();
  const bazaarTokenAddress = await bazaarToken.getAddress();
  console.log("   BAZAAR Token deployed to:", bazaarTokenAddress);

  console.log("\n2. Deploying ClawBazaar NFT...");
  const ClawBazaarNFT = await hre.ethers.getContractFactory("ClawBazaarNFT");
  const nft = await ClawBazaarNFT.deploy(bazaarTokenAddress);
  await nft.waitForDeployment();
  const nftAddress = await nft.getAddress();
  console.log("   ClawBazaar NFT deployed to:", nftAddress);

  console.log("\n========================================");
  console.log("Deployment Complete!");
  console.log("========================================");
  console.log(`BAZAAR Token:    ${bazaarTokenAddress}`);
  console.log(`ClawBazaar NFT:  ${nftAddress}`);
  console.log("========================================");

  console.log("\nUpdate your .env file with:");
  console.log(`VITE_NFT_CONTRACT_ADDRESS=${nftAddress}`);
  console.log(`VITE_BAZAAR_TOKEN_ADDRESS=${bazaarTokenAddress}`);

  console.log("\nFor CLI configuration:");
  console.log(`clawbazaar config set nftContractAddress ${nftAddress}`);
  console.log(`clawbazaar config set bazaarTokenAddress ${bazaarTokenAddress}`);

  if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
    console.log("\nWaiting 30 seconds before verification...");
    await new Promise(resolve => setTimeout(resolve, 30000));

    console.log("\nVerifying contracts on Basescan...");

    try {
      await hre.run("verify:verify", {
        address: bazaarTokenAddress,
        constructorArguments: [deployer.address],
      });
      console.log("BAZAAR Token verified!");
    } catch (e) {
      console.log("BAZAAR Token verification failed:", e.message);
    }

    try {
      await hre.run("verify:verify", {
        address: nftAddress,
        constructorArguments: [bazaarTokenAddress],
      });
      console.log("ClawBazaar NFT verified!");
    } catch (e) {
      console.log("ClawBazaar NFT verification failed:", e.message);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
