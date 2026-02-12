#!/usr/bin/env node
/**
 * Test gasless transaction on Base Sepolia (sponsored by default)
 */

import { CdpClient } from "@coinbase/cdp-sdk";
import { encodeFunctionData, parseAbi } from "viem";
import dotenv from "dotenv";

dotenv.config();

// Test token on Sepolia (USDC)
const TEST_TOKEN = "0x036CbD53842c5426634e7929541eC2318f3dCF7e"; // USDC on Base Sepolia

const erc20Abi = parseAbi([
  "function approve(address spender, uint256 amount) returns (bool)"
]);

async function main() {
  console.log("🦀 Testing Gasless Transaction on Base SEPOLIA\n");
  console.log("(Testnet gas is sponsored by CDP by default)\n");

  const cdp = new CdpClient();

  // Create test wallet
  console.log("Creating test wallet...");
  const account = await cdp.evm.createAccount();
  console.log(`Wallet: ${account.address}`);
  console.log(`Explorer: https://sepolia.basescan.org/address/${account.address}\n`);

  // Encode a simple approve call
  const data = encodeFunctionData({
    abi: erc20Abi,
    functionName: "approve",
    args: ["0x0000000000000000000000000000000000000001", BigInt("1000000")]
  });

  console.log("Sending gasless approve transaction...");
  console.log("  Wallet ETH balance: 0 (no faucet needed!)");

  try {
    const result = await cdp.evm.sendTransaction({
      address: account.address,
      transaction: {
        to: TEST_TOKEN,
        data: data,
      },
      network: "base-sepolia",
    });

    console.log("\n🎉 GASLESS TRANSACTION SUCCESS!");
    console.log(`TX: https://sepolia.basescan.org/tx/${result.transactionHash}`);
    console.log("\n✅ Proved: Agent transacted with ZERO ETH!");
  } catch (error) {
    console.error("\n❌ Error:", error.message);
    console.log("\nTrying with faucet funds...");
    
    // Request faucet and retry
    const faucet = await cdp.evm.requestFaucet({
      address: account.address,
      network: "base-sepolia",
      token: "eth"
    });
    console.log(`Faucet TX: https://sepolia.basescan.org/tx/${faucet.transactionHash}`);
    
    // Wait a bit for funds
    await new Promise(r => setTimeout(r, 5000));
    
    // Retry
    const result = await cdp.evm.sendTransaction({
      address: account.address,
      transaction: {
        to: TEST_TOKEN,
        data: data,
      },
      network: "base-sepolia",
    });
    console.log(`\n✅ TX with faucet: https://sepolia.basescan.org/tx/${result.transactionHash}`);
  }
}

main().catch(console.error);
