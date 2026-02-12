#!/usr/bin/env node
/**
 * CDP Mainnet Wallet Test
 * Creates a production agent wallet on Base mainnet
 */

import { CdpClient } from "@coinbase/cdp-sdk";
import dotenv from "dotenv";

dotenv.config();

async function main() {
  console.log("🦀 CLAWBAZAAR CDP Mainnet Wallet Test\n");

  const cdp = new CdpClient();

  // Create mainnet wallet
  console.log("Creating agent wallet on Base Mainnet...");
  const account = await cdp.evm.createAccount();
  
  console.log("\n🎉 Mainnet Agent Wallet Created!");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`Address: ${account.address}`);
  console.log(`Network: Base Mainnet`);
  console.log(`Explorer: https://basescan.org/address/${account.address}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("\n✅ This wallet can transact GASLESS on Base!");
  console.log("   CDP sponsors gas fees automatically.");
  
  return account;
}

main().catch(console.error);
