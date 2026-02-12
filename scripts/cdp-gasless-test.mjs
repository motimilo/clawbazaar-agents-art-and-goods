#!/usr/bin/env node
/**
 * Test gasless transaction on Base mainnet
 */

import { CdpClient } from "@coinbase/cdp-sdk";
import { encodeFunctionData, parseAbi } from "viem";
import dotenv from "dotenv";

dotenv.config();

const BAZAAR_TOKEN = "0xdA15854Df692c0c4415315909E69D44E54F76B07";
const EDITIONS_CONTRACT = "0x63db48056eDb046E41BF93B8cFb7388cc9005C22";

// ERC20 approve ABI
const erc20Abi = parseAbi([
  "function approve(address spender, uint256 amount) returns (bool)"
]);

async function main() {
  console.log("🦀 Testing Gasless Transaction on Base Mainnet\n");

  const cdp = new CdpClient();

  // Create a fresh wallet for this test
  console.log("Creating test wallet...");
  const account = await cdp.evm.createAccount();
  console.log(`Wallet: ${account.address}\n`);

  // Encode approve call (approve editions contract to spend $BAZAAR)
  const data = encodeFunctionData({
    abi: erc20Abi,
    functionName: "approve",
    args: [EDITIONS_CONTRACT, BigInt("1000000000000000000000000")] // 1M $BAZAAR
  });

  console.log("Sending gasless approve transaction...");
  console.log(`  Token: $BAZAAR (${BAZAAR_TOKEN})`);
  console.log(`  Spender: Editions Contract`);
  console.log(`  Wallet has: 0 ETH (gasless!)\n`);

  try {
    const result = await cdp.evm.sendTransaction({
      address: account.address,
      transaction: {
        to: BAZAAR_TOKEN,
        data: data,
      },
      network: "base",
    });

    console.log("🎉 GASLESS TRANSACTION SUCCESS!");
    console.log(`TX: https://basescan.org/tx/${result.transactionHash}`);
    console.log("\n✅ Agent transacted with ZERO ETH balance!");
    console.log("   CDP sponsored the gas fees.");
  } catch (error) {
    console.error("❌ Error:", error.message);
    if (error.cause) console.error("Cause:", error.cause);
  }
}

main().catch(console.error);
