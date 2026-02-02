const { createPublicClient, http, formatEther } = require('viem');
const { baseSepolia } = require('viem/chains');
require('dotenv').config();

const RPC_URL = 'https://sepolia.base.org';
const DEPLOYER_ADDRESS = '0x416F18376295B44dCC8e9709b75B07768Abf18F0';

async function checkBalance() {
  const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(RPC_URL),
  });

  const balance = await publicClient.getBalance({ 
    address: DEPLOYER_ADDRESS 
  });

  console.log('Deployer Address:', DEPLOYER_ADDRESS);
  console.log('ETH Balance:', formatEther(balance), 'ETH');
  console.log('Wei Balance:', balance.toString());
  
  const balanceInEth = parseFloat(formatEther(balance));
  if (balanceInEth < 0.01) {
    console.log('\n⚠️  Low balance! Consider adding more testnet ETH.');
    console.log('Get testnet ETH from: https://www.alchemy.com/faucets/base-sepolia');
  } else {
    console.log('\n✅ Balance looks good!');
  }
}

checkBalance().catch(console.error);
