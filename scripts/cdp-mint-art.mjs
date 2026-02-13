#!/usr/bin/env node
/**
 * CDP Wallet - Mint & Buy Art on CLAWBAZAAR
 */

import { CdpClient } from "@coinbase/cdp-sdk";
import { createWalletClient, createPublicClient, http, formatEther, encodeFunctionData, parseAbi } from "viem";
import { base } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import dotenv from "dotenv";

dotenv.config();

const BAZAAR_TOKEN = "0xdA15854Df692c0c4415315909E69D44E54F76B07";
const EDITIONS_CONTRACT = "0x63db48056eDb046E41BF93B8cFb7388cc9005C22";
const CDP_WALLET = "0x8d224E3fb4996DB6839e980D116135A392861cDE";
const PINCH_WALLET = "0xdCD12A0046E1BD40Edc0125F4Fc3e2b9DAAA5F61";

const erc20Abi = parseAbi([
  "function transfer(address to, uint256 amount) returns (bool)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function balanceOf(address account) view returns (uint256)",
]);

async function main() {
  console.log("🦀 CDP Wallet - Mint & Buy Art Test\n");

  const cdp = new CdpClient();
  const pinchAccount = privateKeyToAccount(process.env.CLAWBAZAAR_PRIVATE_KEY);

  const publicClient = createPublicClient({
    chain: base,
    transport: http("https://mainnet.base.org"),
  });

  const walletClient = createWalletClient({
    account: pinchAccount,
    chain: base,
    transport: http("https://mainnet.base.org"),
  });

  // Check balances
  console.log("1. Checking balances...");
  const cdpEth = await publicClient.getBalance({ address: CDP_WALLET });
  const cdpBazaar = await publicClient.readContract({
    address: BAZAAR_TOKEN,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [CDP_WALLET],
  });
  const pinchBazaar = await publicClient.readContract({
    address: BAZAAR_TOKEN,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [PINCH_WALLET],
  });

  console.log("   CDP Wallet ETH:", formatEther(cdpEth));
  console.log("   CDP Wallet $BAZAAR:", formatEther(cdpBazaar));
  console.log("   PINCH0x $BAZAAR:", formatEther(pinchBazaar));

  // Transfer $BAZAAR to CDP wallet
  if (cdpBazaar < BigInt("1000000000000000000000")) { // < 1000 BAZAAR
    console.log("\n2. Transferring $BAZAAR to CDP wallet...");
    const transferAmount = BigInt("5000000000000000000000"); // 5000 BAZAAR
    
    const transferData = encodeFunctionData({
      abi: erc20Abi,
      functionName: "transfer",
      args: [CDP_WALLET, transferAmount],
    });

    const transferTx = await walletClient.sendTransaction({
      to: BAZAAR_TOKEN,
      data: transferData,
    });
    console.log("   Transfer TX:", transferTx);
    await publicClient.waitForTransactionReceipt({ hash: transferTx });
    console.log("   ✅ Transferred 5000 $BAZAAR to CDP wallet");
  }

  // Approve $BAZAAR spending from CDP wallet
  console.log("\n3. Approving $BAZAAR spending from CDP wallet...");
  const approveData = encodeFunctionData({
    abi: erc20Abi,
    functionName: "approve",
    args: [EDITIONS_CONTRACT, BigInt("1000000000000000000000000")], // 1M BAZAAR
  });

  const approveTx = await cdp.evm.sendTransaction({
    address: CDP_WALLET,
    transaction: {
      to: BAZAAR_TOKEN,
      data: approveData,
    },
    network: "base",
  });
  console.log("   Approve TX:", approveTx.transactionHash);
  console.log("   https://basescan.org/tx/" + approveTx.transactionHash);

  // Wait for indexing
  await new Promise(r => setTimeout(r, 3000));

  // Mint edition #13 (LIQUIDATION CASCADE - 100 BAZAAR)
  console.log("\n4. Minting Edition #13 (LIQUIDATION CASCADE)...");
  
  // mint(uint256 editionId, uint256 quantity)
  // Function selector: 0x94bf804d
  const editionId = 13n;
  const quantity = 1n;
  const mintData = "0x94bf804d" + 
    editionId.toString(16).padStart(64, "0") + 
    quantity.toString(16).padStart(64, "0");

  try {
    const mintTx = await cdp.evm.sendTransaction({
      address: CDP_WALLET,
      transaction: {
        to: EDITIONS_CONTRACT,
        data: mintData,
      },
      network: "base",
    });
    console.log("   Mint TX:", mintTx.transactionHash);
    console.log("   https://basescan.org/tx/" + mintTx.transactionHash);
    console.log("\n🎉 ART PURCHASED WITH CDP WALLET!");
  } catch (e) {
    console.log("   ❌ Mint failed:", e.message);
  }

  // Final balances
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  const finalBazaar = await publicClient.readContract({
    address: BAZAAR_TOKEN,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [CDP_WALLET],
  });
  console.log("CDP Wallet Final $BAZAAR:", formatEther(finalBazaar));
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
}

main().catch(console.error);
