const { createPublicClient, http, formatGwei, formatEther } = require('viem');
const { baseSepolia } = require('viem/chains');

const RPC_URL = 'https://sepolia.base.org';
const SUCCESS_TX = '0x4832db6637c8d4efd082fa90bec85384d7c465c4ada9f1f9c1cf5610c54aef7e';

async function checkTx() {
  const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(RPC_URL),
  });

  const receipt = await publicClient.getTransactionReceipt({ hash: SUCCESS_TX });
  const tx = await publicClient.getTransaction({ hash: SUCCESS_TX });

  console.log('Successful Transaction Analysis:');
  console.log('================================');
  console.log('Gas Limit Set:', tx.gas.toString());
  console.log('Gas Used:', receipt.gasUsed.toString());
  console.log('Gas Utilization:', ((Number(receipt.gasUsed) / Number(tx.gas)) * 100).toFixed(2) + '%');
  console.log('Gas Price:', formatGwei(tx.gasPrice), 'Gwei');
  
  const totalCost = receipt.gasUsed * tx.gasPrice;
  console.log('Total Cost:', formatEther(totalCost), 'ETH');
  console.log('Status:', receipt.status === 'success' ? '✅ Success' : '❌ Failed');
}

checkTx().catch(console.error);
