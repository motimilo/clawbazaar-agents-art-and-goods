#!/usr/bin/env node
/**
 * CDP Agentic Wallet Integration Test
 * 
 * Tests Coinbase Developer Platform wallet creation for CLAWBAZAAR agents.
 * 
 * Prerequisites:
 * 1. Sign up at https://portal.cdp.coinbase.com
 * 2. Create API key and Wallet Secret
 * 3. Add to .env:
 *    CDP_API_KEY_ID=your-api-key-id
 *    CDP_API_KEY_SECRET=your-api-key-secret  
 *    CDP_WALLET_SECRET=your-wallet-secret
 */

import { CdpClient } from "@coinbase/cdp-sdk";
import dotenv from "dotenv";

dotenv.config();

const CDP_API_KEY_ID = process.env.CDP_API_KEY_ID;
const CDP_API_KEY_SECRET = process.env.CDP_API_KEY_SECRET;
const CDP_WALLET_SECRET = process.env.CDP_WALLET_SECRET;

async function main() {
  console.log("🦀 CLAWBAZAAR CDP Wallet Integration Test\n");

  // Check credentials
  if (!CDP_API_KEY_ID || !CDP_API_KEY_SECRET || !CDP_WALLET_SECRET) {
    console.log("❌ Missing CDP credentials!\n");
    console.log("To get credentials:");
    console.log("1. Go to https://portal.cdp.coinbase.com");
    console.log("2. Create a CDP API key");
    console.log("3. Generate a Wallet Secret");
    console.log("4. Add to .env:");
    console.log("   CDP_API_KEY_ID=xxx");
    console.log("   CDP_API_KEY_SECRET=xxx");
    console.log("   CDP_WALLET_SECRET=xxx");
    process.exit(1);
  }

  console.log("✅ CDP credentials found\n");

  try {
    // Initialize CDP client
    console.log("Initializing CDP client...");
    const cdp = new CdpClient();

    // Create a new EVM account (Base-compatible)
    console.log("Creating new agent wallet on Base...");
    const account = await cdp.evm.createAccount();
    
    console.log("\n🎉 Agent Wallet Created!");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`Address: ${account.address}`);
    console.log("Network: Base (EVM-compatible)");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    // Test on testnet first
    console.log("Requesting testnet ETH from faucet (Base Sepolia)...");
    const faucetResult = await cdp.evm.requestFaucet({
      address: account.address,
      network: "base-sepolia",
      token: "eth",
    });
    
    console.log(`✅ Faucet TX: https://sepolia.basescan.org/tx/${faucetResult.transactionHash}`);
    console.log("\n🦀 Agent wallet ready for CLAWBAZAAR!");

    return account;
  } catch (error) {
    console.error("❌ Error:", error.message);
    if (error.response) {
      console.error("Response:", error.response.data);
    }
    process.exit(1);
  }
}

main();
