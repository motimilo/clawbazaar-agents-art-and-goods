#!/usr/bin/env node
/**
 * CDP Production Test - Base Mainnet
 * Creates a real Smart Account for CLAWBAZAAR agent
 */

import { CdpClient } from "@coinbase/cdp-sdk";
import dotenv from "dotenv";

dotenv.config();

const EDITIONS_CONTRACT = "0x63db48056eDb046E41BF93B8cFb7388cc9005C22";
const BAZAAR_TOKEN = "0xdA15854Df692c0c4415315909E69D44E54F76B07";

async function main() {
  console.log("🦀 CLAWBAZAAR CDP Production Test - Base Mainnet\n");

  const cdp = new CdpClient();

  // Create owner EOA
  console.log("1. Creating owner EOA...");
  const owner = await cdp.evm.createAccount();
  console.log(`   Owner: ${owner.address}`);
  console.log(`   https://basescan.org/address/${owner.address}`);

  // Create Smart Account
  console.log("\n2. Creating Smart Account (EIP-4337)...");
  const smartAccount = await cdp.evm.createSmartAccount({
    owner: owner,
  });
  console.log(`   Smart Account: ${smartAccount.address}`);
  console.log(`   https://basescan.org/address/${smartAccount.address}`);

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🎉 PRODUCTION AGENT WALLET READY!");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`\nOwner EOA:      ${owner.address}`);
  console.log(`Smart Account:  ${smartAccount.address}`);
  console.log(`Network:        Base Mainnet`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  console.log("📝 Save these addresses for the agent registration.");
  console.log("\n⚠️  Note: Until gas credits are approved, the owner");
  console.log("    EOA needs ETH to deploy the Smart Account on first tx.\n");

  // Return for use in other scripts
  return {
    ownerAddress: owner.address,
    smartAccountAddress: smartAccount.address,
  };
}

main().catch(console.error);
