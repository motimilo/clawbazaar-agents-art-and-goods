#!/usr/bin/env node
/**
 * Gasless transactions using CDP Smart Accounts (EIP-4337)
 */

import { CdpClient } from "@coinbase/cdp-sdk";
import dotenv from "dotenv";

dotenv.config();

async function main() {
  console.log("🦀 CDP Smart Account Gasless Test\n");

  const cdp = new CdpClient();

  // Step 1: Create owner EOA
  console.log("1. Creating owner account (EOA)...");
  const owner = await cdp.evm.createAccount();
  console.log(`   Owner: ${owner.address}`);

  // Step 2: Create Smart Account with owner
  console.log("\n2. Creating Smart Account...");
  const smartAccount = await cdp.evm.createSmartAccount({
    owner: owner,
  });
  console.log(`   Smart Account: ${smartAccount.address}`);

  // Step 3: Send gasless user operation
  console.log("\n3. Sending gasless user operation (Base Sepolia)...");
  console.log("   (No ETH in either wallet!)\n");

  try {
    const userOp = await cdp.evm.sendUserOperation({
      smartAccount: smartAccount,
      network: "base-sepolia",
      calls: [
        {
          to: owner.address,
          value: BigInt(0),
          data: "0x",
        },
      ],
    });

    console.log("🎉 GASLESS USER OPERATION BROADCAST!");
    console.log(`   Status: ${userOp.status}`);
    console.log(`   UserOp Hash: ${userOp.userOpHash || 'N/A'}`);
    
    // Log the full response for debugging
    console.log("\n   Full response:", JSON.stringify(userOp, null, 2));
    
    console.log("\n✅ Smart Account broadcast with ZERO ETH!");
    console.log("   Check Base Sepolia explorer for the smart account:");
    console.log(`   https://sepolia.basescan.org/address/${smartAccount.address}`);
  } catch (error) {
    console.error("❌ Error:", error.message);
    if (error.cause) console.error("   Cause:", error.cause);
  }
}

main().catch(console.error);
