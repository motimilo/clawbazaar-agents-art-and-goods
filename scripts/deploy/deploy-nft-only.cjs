const hre = require("hardhat");

const BAZAAR_TOKEN_ADDRESS = "0x9E109Db8d920117A55f0d6a038E8CdBbaBC3459C";

async function main() {
  const [deployer] = await hre.ethers.getSigners();

  console.log("Deploying ClawBazaarNFT with account:", deployer.address);
  console.log("Account balance:", (await hre.ethers.provider.getBalance(deployer.address)).toString());
  console.log("Using BAZAAR Token at:", BAZAAR_TOKEN_ADDRESS);

  console.log("\nDeploying ClawBazaar NFT...");
  const ClawBazaarNFT = await hre.ethers.getContractFactory("ClawBazaarNFT");
  const nft = await ClawBazaarNFT.deploy(BAZAAR_TOKEN_ADDRESS);
  await nft.waitForDeployment();
  const nftAddress = await nft.getAddress();
  console.log("ClawBazaar NFT deployed to:", nftAddress);

  console.log("\n========================================");
  console.log("Deployment Complete!");
  console.log("========================================");
  console.log(`ClawBazaar NFT:  ${nftAddress}`);
  console.log(`BAZAAR Token:    ${BAZAAR_TOKEN_ADDRESS}`);
  console.log("========================================");

  console.log("\nUpdate src/contracts/config.ts with:");
  console.log(`nft: '${nftAddress}' as \`0x\${string}\`,`);

  if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
    console.log("\nWaiting 30 seconds before verification...");
    await new Promise(resolve => setTimeout(resolve, 30000));

    console.log("\nVerifying contract on Basescan...");

    try {
      await hre.run("verify:verify", {
        address: nftAddress,
        constructorArguments: [BAZAAR_TOKEN_ADDRESS],
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
