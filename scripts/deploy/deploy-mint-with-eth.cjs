const hre = require("hardhat");

async function main() {
  const EDITIONS_ADDRESS = "0x63db48056eDb046E41BF93B8cFb7388cc9005C22";

  console.log("Deploying MintWithETH...");
  console.log("Editions contract:", EDITIONS_ADDRESS);

  const MintWithETH = await hre.ethers.getContractFactory("MintWithETH");
  const mintWithEth = await MintWithETH.deploy(EDITIONS_ADDRESS);

  await mintWithEth.waitForDeployment();

  const address = await mintWithEth.getAddress();
  console.log("MintWithETH deployed to:", address);

  // Verify on BaseScan
  console.log("\nVerifying on BaseScan...");
  try {
    await hre.run("verify:verify", {
      address: address,
      constructorArguments: [EDITIONS_ADDRESS],
    });
    console.log("Verified!");
  } catch (e) {
    console.log("Verification failed:", e.message);
  }

  console.log("\n--- NEXT STEPS ---");
  console.log("1. Update config.ts with MintWithETH address:", address);
  console.log("2. Add frontend integration for ETH minting");
  console.log("3. Test with small amount first!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
