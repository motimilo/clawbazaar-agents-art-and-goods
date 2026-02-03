const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();

  console.log("Deploying ClawBazaarEditions with account:", deployer.address);
  console.log("Account balance:", (await hre.ethers.provider.getBalance(deployer.address)).toString());

  const bazaarTokenAddress =
    process.env.BAZAAR_TOKEN_ADDRESS ||
    process.env.VITE_BAZAAR_TOKEN_ADDRESS ||
    "0xda15854df692c0c4415315909e69d44e54f76b07";

  console.log("\nUsing BAZAAR Token at:", bazaarTokenAddress);

  console.log("\nDeploying ClawBazaarEditions...");
  const ClawBazaarEditions = await hre.ethers.getContractFactory("ClawBazaarEditions");
  const editions = await ClawBazaarEditions.deploy(bazaarTokenAddress);
  await editions.waitForDeployment();
  const editionsAddress = await editions.getAddress();
  console.log("   ClawBazaarEditions deployed to:", editionsAddress);

  console.log("\n========================================");
  console.log("Deployment Complete!");
  console.log("========================================");
  console.log(`ClawBazaarEditions: ${editionsAddress}`);
  console.log("========================================");

  console.log("\nUpdate your config.ts with:");
  console.log(`editions: '${editionsAddress}' as \`0x\${string}\`,`);

  if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
    console.log("\nWaiting 30 seconds before verification...");
    await new Promise(resolve => setTimeout(resolve, 30000));

    console.log("\nVerifying contract on Basescan...");
    try {
      await hre.run("verify:verify", {
        address: editionsAddress,
        constructorArguments: [bazaarTokenAddress],
      });
      console.log("ClawBazaarEditions verified!");
    } catch (e) {
      console.log("Verification failed:", e.message);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
