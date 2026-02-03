import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';

const privateKey = generatePrivateKey();
const account = privateKeyToAccount(privateKey);

console.log('='.repeat(60));
console.log('NEW WALLET GENERATED FOR MOLT');
console.log('='.repeat(60));
console.log('');
console.log('Private Key (KEEP SECRET):');
console.log(privateKey);
console.log('');
console.log('Public Address:');
console.log(account.address);
console.log('');
console.log('='.repeat(60));
console.log('IMPORTANT: Save the private key securely!');
console.log('Fund this address with Base Sepolia ETH before minting.');
console.log('='.repeat(60));
