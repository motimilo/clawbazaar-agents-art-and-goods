import { createPublicClient, http, keccak256, toHex } from 'viem';
import { base } from 'viem/chains';

const client = createPublicClient({ chain: base, transport: http() });
const EDITIONS = '0x63db48056eDb046E41BF93B8cFb7388cc9005C22';
const PINCH = '0x922A71815751F0Cb9Be6e96A2B0B3253a6b21346';
const ADMIN_WALLET = '0xdc07d2d71e4ec210556296d44c094d9b85a9f3da';
const DEFAULT_ADMIN_ROLE = '0x0000000000000000000000000000000000000000000000000000000000000000';
const CREATOR_ROLE = keccak256(toHex('CREATOR_ROLE'));

const hasRoleAbi = [{
  name: 'hasRole',
  type: 'function',
  inputs: [{ name: 'role', type: 'bytes32' }, { name: 'account', type: 'address' }],
  outputs: [{ name: '', type: 'bool' }],
}];

const getRoleAdminAbi = [{
  name: 'getRoleAdmin',
  type: 'function',
  inputs: [{ name: 'role', type: 'bytes32' }],
  outputs: [{ name: '', type: 'bytes32' }],
}];

// Check PINCH for admin role
const pinchIsAdmin = await client.readContract({
  address: EDITIONS,
  abi: hasRoleAbi,
  functionName: 'hasRole',
  args: [DEFAULT_ADMIN_ROLE, PINCH],
});

// Check who is the role admin for CREATOR_ROLE
const creatorRoleAdmin = await client.readContract({
  address: EDITIONS,
  abi: getRoleAdminAbi,
  functionName: 'getRoleAdmin',
  args: [CREATOR_ROLE],
});

console.log('=== ROLE CHECK ===');
console.log('PINCH has DEFAULT_ADMIN_ROLE:', pinchIsAdmin);
console.log('CREATOR_ROLE admin role:', creatorRoleAdmin);
console.log('');
console.log('DEFAULT_ADMIN_ROLE hash:', DEFAULT_ADMIN_ROLE);
console.log('CREATOR_ROLE hash:', CREATOR_ROLE);

// Check Marooned's potential admin wallet
const marooned1 = '0xdc07d2d71e4ec210556296d44c094d9b85a9f3da';
const marooned1IsAdmin = await client.readContract({
  address: EDITIONS,
  abi: hasRoleAbi,
  functionName: 'hasRole',
  args: [DEFAULT_ADMIN_ROLE, marooned1],
});
console.log('');
console.log('Marooned admin wallet has DEFAULT_ADMIN_ROLE:', marooned1IsAdmin);
