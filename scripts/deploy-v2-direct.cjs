/**
 * Deploy ClawBazaar v2 Contracts to Base Sepolia
 * Uses solcjs-compiled artifacts directly with ethers.js
 *
 * Usage: node scripts/deploy-v2-direct.cjs
 *
 * Note: For production, BAZAAR token will be deployed via BNKR API/skills
 */

const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY;
const RPC_URL = "https://sepolia.base.org";

async function main() {
  console.log("=".repeat(60));
  console.log("ClawBazaar v2 Deployment (Direct)");
  console.log("=".repeat(60));

  // Setup provider and wallet
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  console.log("Deployer:", wallet.address);
  const balance = await provider.getBalance(wallet.address);
  console.log("Balance:", ethers.formatEther(balance), "ETH");
  console.log("Network: Base Sepolia (84532)");
  console.log("=".repeat(60));

  // Load compiled artifacts
  const compiledDir = path.join(__dirname, "..", "compiled");

  const nftAbi = JSON.parse(
    fs.readFileSync(
      path.join(compiledDir, "contracts_ClawBazaarNFT_v2_sol_ClawBazaarNFT_v2.abi"),
      "utf8"
    )
  );
  const nftBytecode =
    "0x" +
    fs.readFileSync(
      path.join(compiledDir, "contracts_ClawBazaarNFT_v2_sol_ClawBazaarNFT_v2.bin"),
      "utf8"
    );

  // ============ Use Existing BAZAARToken_v2 ============
  const tokenAddress =
    process.env.BAZAAR_TOKEN_ADDRESS ||
    process.env.VITE_BAZAAR_TOKEN_ADDRESS ||
    "0xda15854df692c0c4415315909e69d44e54f76b07";
  console.log("\n[1/2] Using existing BAZAARToken_v2:", tokenAddress);

  // ============ Deploy ClawBazaarNFT_v2 ============
  console.log("\n[2/2] Deploying ClawBazaarNFT_v2...");

  const defaultRoyaltyBps = 500; // 5% default royalty
  const platformFeeBps = 500; // 5% platform fee (burned)

  const nftFactory = new ethers.ContractFactory(nftAbi, nftBytecode, wallet);
  const nftContract = await nftFactory.deploy(
    tokenAddress,
    defaultRoyaltyBps,
    platformFeeBps,
    { gasLimit: 8000000 }
  );

  console.log("Tx submitted:", nftContract.deploymentTransaction().hash);
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

  console.log("\nBasescan Links:");
  console.log(`  Token: https://sepolia.basescan.org/address/${tokenAddress}`);
  console.log(`  NFT:   https://sepolia.basescan.org/address/${nftAddress}`);

  console.log("\nNext Steps:");
  console.log("1. Update /src/contracts/config.ts with new addresses");

  // Save deployment info
  const deploymentInfo = {
    network: "baseSepolia",
    chainId: 84532,
    deployer: wallet.address,
    timestamp: new Date().toISOString(),
    contracts: {
      BAZAARToken_v2: tokenAddress,
      ClawBazaarNFT_v2: nftAddress,
    },
    config: {
      defaultRoyaltyBps,
      platformFeeBps,
    },
  };

  fs.writeFileSync(
    path.join(__dirname, "..", "deployment-v2.json"),
    JSON.stringify(deploymentInfo, null, 2)
  );
  console.log("\nDeployment info saved to deployment-v2.json");

  console.log("\n" + "=".repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  });
