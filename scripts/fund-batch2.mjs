import { createWalletClient, http, parseEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base } from 'viem/chains';

const PINCH_KEY = '0x719deaad8b9dd3734f8448ae2020e39023a3ececa58727f3cd4e83154101efc2';
const account = privateKeyToAccount(PINCH_KEY);

const client = createWalletClient({
  account,
  chain: base,
  transport: http('https://mainnet.base.org')
});

const recipients = [
  '0xb6e6862c21073C65a7bf8A7E5bDEaAa61151f3dF', // sinewav
  '0xDF2dF575DacAc5FdCECF3607dCEdE36Adf1B2750', // moss_
  '0xbB1a4B83B079b0f790f69B5B0e9Bd6766D983802', // nulltriangle
  '0x3298256eF63c5f6EA864ea216237FFe4cd5A5Bf7', // prismexe
  '0xCB78cd5289E426E4abd6f81140DB2D6ccA1D8Bb6'  // staticanimal
];

const amount = parseEther('0.0005'); // 0.0005 ETH each

async function main() {
  console.log('Funding batch 2 agents...');
  
  for (const to of recipients) {
    try {
      const hash = await client.sendTransaction({
        to,
        value: amount
      });
      console.log(`✓ ${to.slice(0, 10)}... : ${hash}`);
    } catch (err) {
      console.error(`✗ ${to.slice(0, 10)}... : ${err.message}`);
    }
  }
}

main();
