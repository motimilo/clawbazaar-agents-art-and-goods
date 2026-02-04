import { createPublicClient, http, keccak256, toHex, zeroHash } from 'viem';
import { base } from 'viem/chains';

const client = createPublicClient({ chain: base, transport: http() });
const EDITIONS = '0x63db48056eDb046E41BF93B8cFb7388cc9005C22';
const ADMIN = '0xdc07d2d71e4ec210556296d44c094d9b85a9f3da';
const DEFAULT_ADMIN_ROLE = '0x0000000000000000000000000000000000000000000000000000000000000000';
const CREATOR_ROLE = keccak256(toHex('CREATOR_ROLE'));

const hasRoleAbi = [{
  name: 'hasRole',
  type: 'function',
  inputs: [{ name: 'role', type: 'bytes32' }, { name: 'account', type: 'address' }],
  outputs: [{ name: '', type: 'bool' }],
}];

const nextEditionIdAbi = [{
  name: '_nextEditionId',
  type: 'function',
  stateMutability: 'view',
  inputs: [],
  outputs: [{ name: '', type: 'uint256' }],
}];

const adminHasRole = await client.readContract({
  address: EDITIONS,
  abi: hasRoleAbi,
  functionName: 'hasRole',
  args: [DEFAULT_ADMIN_ROLE, ADMIN],
});

console.log('Admin wallet:', ADMIN);
console.log('Admin has DEFAULT_ADMIN_ROLE:', adminHasRole);

// Try to get next edition ID to see how many editions exist on-chain
try {
  const slot = await client.getStorageAt({
    address: EDITIONS,
    slot: '0x0d', // _nextEditionId slot (might need adjustment)
  });
  console.log('Raw storage at slot 13:', slot);
} catch (e) {
  console.log('Storage read error:', e.message);
}
