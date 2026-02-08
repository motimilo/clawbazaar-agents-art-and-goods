import { createPublicClient, http, formatUnits, formatEther, parseAbi, encodeFunctionData } from 'viem';
import { base } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import * as dotenv from 'dotenv';

dotenv.config();

const EDITIONS_ADDRESS = '0x63db48056eDb046E41BF93B8cFb7388cc9005C22' as const;
const BAZAAR_TOKEN = '0xdA15854Df692c0c4415315909E69D44E54F76B07' as const;

const EDITIONS_ABI = parseAbi([
  'function mint(uint256 editionId, uint256 amount) external',
  'function editionPrice(uint256 editionId) external view returns (uint256)',
  'function editionMaxSupply(uint256 editionId) external view returns (uint256)',
  'function totalSupply(uint256 id) external view returns (uint256)',
  'function editionActive(uint256 editionId) external view returns (bool)',
  'function bazaarToken() external view returns (address)',
]);

const ERC20_ABI = parseAbi([
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
]);

async function main() {
  const privateKey = process.env.CLAWBAZAAR_PRIVATE_KEY;
  const account = privateKey ? privateKeyToAccount(privateKey as `0x${string}`) : null;
  
  const publicClient = createPublicClient({
    chain: base,
    transport: http('https://mainnet.base.org'),
  });

  console.log('=== ON-CHAIN EDITIONS CHECK ===\n');
  console.log('Contract:', EDITIONS_ADDRESS);
  console.log('Wallet:', account?.address || 'none');

  // Check bazaar token from contract
  const bazaarFromContract = await publicClient.readContract({
    address: EDITIONS_ADDRESS,
    abi: EDITIONS_ABI,
    functionName: 'bazaarToken',
  });
  console.log('$BAZAAR token from contract:', bazaarFromContract);
  console.log('Expected $BAZAAR:', BAZAAR_TOKEN);
  console.log('Match:', bazaarFromContract.toLowerCase() === BAZAAR_TOKEN.toLowerCase() ? '✅' : '❌ MISMATCH');

  // Get balances
  const gasPrice = await publicClient.getGasPrice();
  console.log('\nGas Price:', formatUnits(gasPrice, 9), 'gwei');

  if (account) {
    const ethBal = await publicClient.getBalance({ address: account.address });
    const bazaarBal = await publicClient.readContract({
      address: BAZAAR_TOKEN,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [account.address],
    });
    const allowance = await publicClient.readContract({
      address: BAZAAR_TOKEN,
      abi: ERC20_ABI,
      functionName: 'allowance',
      args: [account.address, EDITIONS_ADDRESS],
    });

    console.log('\n=== WALLET STATE ===');
    console.log('ETH:', formatEther(ethBal));
    console.log('$BAZAAR:', formatUnits(bazaarBal, 18));
    console.log('Allowance to Editions:', formatUnits(allowance, 18));
  }

  console.log('\n=== EDITION STATES (0-5) ===');
  
  for (let i = 0; i <= 5; i++) {
    console.log(`\n--- Edition ${i} ---`);
    try {
      const [price, maxSupply, minted, active] = await Promise.all([
        publicClient.readContract({ address: EDITIONS_ADDRESS, abi: EDITIONS_ABI, functionName: 'editionPrice', args: [BigInt(i)] }),
        publicClient.readContract({ address: EDITIONS_ADDRESS, abi: EDITIONS_ABI, functionName: 'editionMaxSupply', args: [BigInt(i)] }),
        publicClient.readContract({ address: EDITIONS_ADDRESS, abi: EDITIONS_ABI, functionName: 'totalSupply', args: [BigInt(i)] }),
        publicClient.readContract({ address: EDITIONS_ADDRESS, abi: EDITIONS_ABI, functionName: 'editionActive', args: [BigInt(i)] }),
      ]);

      console.log(`Price: ${formatUnits(price, 18)} $BAZAAR`);
      console.log(`Supply: ${minted}/${maxSupply} minted`);
      console.log(`Active: ${active}`);

      if (active && minted < maxSupply && account) {
        // Try to estimate gas
        const mintData = encodeFunctionData({
          abi: EDITIONS_ABI,
          functionName: 'mint',
          args: [BigInt(i), 1n],
        });

        try {
          const gas = await publicClient.estimateGas({
            account: account.address,
            to: EDITIONS_ADDRESS,
            data: mintData,
          });
          console.log(`Gas estimate: ${gas} (~${formatEther(gas * gasPrice)} ETH)`);
        } catch (err: any) {
          console.log(`Gas estimate FAILED: ${err.shortMessage || err.message}`);
          // This is likely the "high gas" issue - wallet can't estimate
        }
      }
    } catch (err: any) {
      console.log(`Error: ${err.shortMessage || err.message}`);
    }
  }
}

main().catch(console.error);
