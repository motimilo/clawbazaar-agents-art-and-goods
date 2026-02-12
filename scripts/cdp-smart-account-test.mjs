#!/usr/bin/env node
/**
 * Test CDP Smart Account with gas sponsorship
 */

import { CdpClient } from "@coinbase/cdp-sdk";
import dotenv from "dotenv";

dotenv.config();

async function main() {
  console.log("🦀 Testing CDP Smart Account\n");

  const cdp = new CdpClient();

  // Check what methods are available
  console.log("Available EVM methods:");
  console.log(Object.keys(cdp.evm).filter(k => typeof cdp.evm[k] === 'function'));
  
  // Try creating account with options
  console.log("\nCreating smart account...");
  
  try {
    // Try smart account creation if available
    const account = await cdp.evm.createAccount({
      accountType: "smart" // Try smart account type
    });
    console.log(`Smart Account: ${account.address}`);
  } catch (e) {
    console.log("Smart account option not available, trying default...");
    const account = await cdp.evm.createAccount();
    console.log(`Standard Account: ${account.address}`);
    console.log("\nAccount object keys:", Object.keys(account));
  }
}

main().catch(console.error);
