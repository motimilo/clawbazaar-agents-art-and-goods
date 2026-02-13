#!/usr/bin/env node
/**
 * Full CDP Production Test on Base Mainnet
 * 1. Create CDP wallet
 * 2. Fund from PINCH0x
 * 3. Send test transaction
 */

import { CdpClient } from "@coinbase/cdp-sdk";
import { createWalletClient, createPublicClient, http, parseEther, formatEther } from "viem";
import { base } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import dotenv from "dotenv";

dotenv.config();

const PINCH_PRIVATE_KEY = process.env.CLAWBAZAAR_PRIVATE_KEY;
const TEST_AMOUNT = "0.0005"; // 0.0005 ETH for testing

async function main() {
  console.log("🦀 CDP Mainnet Production Test\n");

  // Check PINCH0x wallet
  if (!PINCH_PRIVATE_KEY) {
    console.error("❌ CLAWBAZAAR_PRIVATE_KEY not found in .env");
    process.exit(1);
  }

  const pinchAccount = privateKeyToAccount(PINCH_PRIVATE_KEY);
  console.log("PINCH0x Wallet:", pinchAccount.address);

  const publicClient = createPublicClient({
    chain: base,
    transport: http("https://mainnet.base.org"),
  });

  const walletClient = createWalletClient({
    account: pinchAccount,
    chain: base,
    transport: http("https://mainnet.base.org"),
  });

  // Check PINCH0x ETH balance
  const pinchBalance = await publicClient.getBalance({ address: pinchAccount.address });
  console.log("PINCH0x ETH Balance:", formatEther(pinchBalance), "ETH");

  if (pinchBalance < parseEther(TEST_AMOUNT)) {
    console.error("❌ Insufficient ETH in PINCH0x wallet");
    process.exit(1);
  }

  // Create CDP wallet
  console.log("\n1. Creating CDP agent wallet...");
  const cdp = new CdpClient();
  const cdpAccount = await cdp.evm.createAccount();
  console.log("   CDP Wallet:", cdpAccount.address);

  // Fund CDP wallet from PINCH0x
  console.log("\n2. Funding CDP wallet from PINCH0x...");
  console.log("   Amount:", TEST_AMOUNT, "ETH");
  
  const fundTx = await walletClient.sendTransaction({
    to: cdpAccount.address,
    value: parseEther(TEST_AMOUNT),
  });
  console.log("   TX:", fundTx);
  console.log("   https://basescan.org/tx/" + fundTx);

  // Wait for confirmation
  console.log("   Waiting for confirmation...");
  await publicClient.waitForTransactionReceipt({ hash: fundTx });
  console.log("   ✅ Funded!");

  // Check CDP wallet balance
  const cdpBalance = await publicClient.getBalance({ address: cdpAccount.address });
  console.log("   CDP Wallet Balance:", formatEther(cdpBalance), "ETH");

  // Send transaction from CDP wallet
  console.log("\n3. Sending transaction FROM CDP wallet...");
  const testTx = await cdp.evm.sendTransaction({
    address: cdpAccount.address,
    transaction: {
      to: pinchAccount.address, // Send back to PINCH0x
      value: parseEther("0.0001"), // Tiny amount
    },
    network: "base",
  });
  
  console.log("   TX:", testTx.transactionHash);
  console.log("   https://basescan.org/tx/" + testTx.transactionHash);

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🎉 CDP PRODUCTION TEST COMPLETE!");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("CDP Wallet:", cdpAccount.address);
  console.log("Transactions: 2 (fund + send)");
  console.log("Status: ✅ WORKING ON MAINNET");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
}

main().catch(console.error);
