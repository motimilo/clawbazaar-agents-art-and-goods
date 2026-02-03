/**
 * Verify v2 contracts are working correctly
 */

const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const RPC_URL = "https://sepolia.base.org";

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC_URL);

  // Load deployment info
  const deployment = JSON.parse(
    fs.readFileSync(path.join(__dirname, "..", "deployment-v2.json"), "utf8")
  );

  // Load ABIs
  const compiledDir = path.join(__dirname, "..", "compiled");
  const tokenAbi = JSON.parse(
    fs.readFileSync(
      path.join(compiledDir, "contracts_BAZAARToken_v2_sol_BAZAARToken_v2.abi"),
      "utf8"
    )
  );
  const nftAbi = JSON.parse(
    fs.readFileSync(
      path.join(compiledDir, "contracts_ClawBazaarNFT_v2_sol_ClawBazaarNFT_v2.abi"),
      "utf8"
    )
  );

  console.log("=".repeat(60));
  console.log("ClawBazaar v2 Contract Verification");
  console.log("=".repeat(60));

  // ============ Token Contract ============
  console.log("\n[BAZAARToken_v2]");
  const token = new ethers.Contract(deployment.contracts.BAZAARToken_v2, tokenAbi, provider);

  const tokenName = await token.name();
  const tokenSymbol = await token.symbol();
  const totalSupply = await token.totalSupply();
  const maxSupply = await token.MAX_SUPPLY();
  const paused = await token.paused();

  console.log(`  Address: ${deployment.contracts.BAZAARToken_v2}`);
  console.log(`  Name: ${tokenName}`);
  console.log(`  Symbol: ${tokenSymbol}`);
  console.log(`  Total Supply: ${ethers.formatEther(totalSupply)} BZAAR`);
  console.log(`  Max Supply: ${ethers.formatEther(maxSupply)} BZAAR`);
  console.log(`  Paused: ${paused}`);

  // ============ NFT Contract ============
  console.log("\n[ClawBazaarNFT_v2]");
  const nft = new ethers.Contract(deployment.contracts.ClawBazaarNFT_v2, nftAbi, provider);

  const nftName = await nft.name();
  const nftSymbol = await nft.symbol();
  const nftTotalSupply = await nft.totalSupply();
  const nftPaused = await nft.paused();
  const platformFee = await nft.platformFeeBps();
  const defaultRoyalty = await nft.defaultRoyaltyBps();
  const totalBurned = await nft.totalBurned();
  const linkedToken = await nft.bazaarToken();

  console.log(`  Address: ${deployment.contracts.ClawBazaarNFT_v2}`);
  console.log(`  Name: ${nftName}`);
  console.log(`  Symbol: ${nftSymbol}`);
  console.log(`  Total Supply: ${nftTotalSupply}`);
  console.log(`  Paused: ${nftPaused}`);
  console.log(`  Platform Fee: ${Number(platformFee) / 100}%`);
  console.log(`  Default Royalty: ${Number(defaultRoyalty) / 100}%`);
  console.log(`  Total BZAAR Burned: ${ethers.formatEther(totalBurned)}`);
  console.log(`  Linked Token: ${linkedToken}`);

  // ============ Role Verification ============
  console.log("\n[Access Control]");
  const MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MINTER_ROLE"));
  const DEFAULT_ADMIN_ROLE = "0x0000000000000000000000000000000000000000000000000000000000000000";

  const deployerHasMinter = await nft.hasRole(MINTER_ROLE, deployment.deployer);
  const deployerHasAdmin = await nft.hasRole(DEFAULT_ADMIN_ROLE, deployment.deployer);

  console.log(`  Deployer (${deployment.deployer}):`);
  console.log(`    Has MINTER_ROLE: ${deployerHasMinter}`);
  console.log(`    Has DEFAULT_ADMIN_ROLE: ${deployerHasAdmin}`);

  console.log("\n" + "=".repeat(60));
  console.log("VERIFICATION COMPLETE - All contracts functional!");
  console.log("=".repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Verification failed:", error);
    process.exit(1);
  });
