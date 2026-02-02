const { createPublicClient, http, formatGwei, formatEther } = require('viem');
const { baseSepolia } = require('viem/chains');

const RPC_URL = 'https://sepolia.base.org';
const SUCCESS_TX = '0x0044898bf42c03355dcc51a5cbc342d637af4d51dbd2053d72fbd982a6f104cd';

async function analyzeTx() {
  const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(RPC_URL),
  });

  const receipt = await publicClient.getTransactionReceipt({ hash: SUCCESS_TX });
  const tx = await publicClient.getTransaction({ hash: SUCCESS_TX });

  console.log('✅ SUCCESSFUL MINT!');
  console.log('==================');
  console.log('Gas Limit Set:', tx.gas.toString());
  console.log('Gas Actually Used:', receipt.gasUsed.toString());
  console.log('Gas Utilization:', ((Number(receipt.gasUsed) / Number(tx.gas)) * 100).toFixed(2) + '%');
  console.log('Gas Price:', formatGwei(tx.gasPrice), 'Gwei');
  
  const totalCost = receipt.gasUsed * tx.gasPrice;
  console.log('Transaction Cost:', formatEther(totalCost), 'ETH');
  console.log('Status:', receipt.status);
}

analyzeTx().catch(console.error);
