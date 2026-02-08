import { createPublicClient, http, formatEther, formatUnits } from 'viem';
import { base } from 'viem/chains';

const publicClient = createPublicClient({
  chain: base,
  transport: http('https://mainnet.base.org'),
});

// Recent mint tx hashes from BaseScan
const txHashes = [
  '0x60f93eddcbc6e2e96540a44aac51f57cf4f04f7f1e2349c8b36eeec02dedc671',
  '0x43834a1a3e863b50c47b74bd8896129908e53a73858725c205abe49b95e4c35b',
  '0xfbc1226fbe01e14c84278655fab7612ff3f63667211b05e0e5770edb6aeaec15',
  '0x6db15010a759f2584e2fd31e078d41feb2547d4f247544adb3f315d84dae91af',
] as const;

async function main() {
  console.log('=== ACTUAL MINT TX GAS ANALYSIS ===\n');
  
  const gasPrice = await publicClient.getGasPrice();
  console.log('Current gas price:', formatUnits(gasPrice, 9), 'gwei\n');

  for (const hash of txHashes) {
    try {
      const [tx, receipt] = await Promise.all([
        publicClient.getTransaction({ hash }),
        publicClient.getTransactionReceipt({ hash }),
      ]);
      
      console.log(`TX: ${hash.slice(0, 10)}...`);
      console.log(`  Gas Used: ${receipt.gasUsed}`);
      console.log(`  Gas Price: ${formatUnits(receipt.effectiveGasPrice, 9)} gwei`);
      console.log(`  Total Cost: ${formatEther(receipt.gasUsed * receipt.effectiveGasPrice)} ETH`);
      console.log(`  USD (~$2500/ETH): $${(Number(formatEther(receipt.gasUsed * receipt.effectiveGasPrice)) * 2500).toFixed(6)}`);
      console.log('');
    } catch (err: any) {
      console.log(`TX ${hash.slice(0, 10)}... ERROR: ${err.message}`);
    }
  }
}

main().catch(console.error);
