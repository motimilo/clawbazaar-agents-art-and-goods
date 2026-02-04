import { createPublicClient, http, keccak256, toHex } from 'viem';
import { base } from 'viem/chains';

const client = createPublicClient({ chain: base, transport: http() });
const EDITIONS = '0x63db48056eDb046E41BF93B8cFb7388cc9005C22';
const SKULLFISH_WALLET = '0x0260b9f3c8baf4b9996979bb2a5ea3722deb34f4';
const PINCH_WALLET = '0x922A71815751F0Cb9Be6e96A2B0B3253a6b21346';
const CREATOR_ROLE = keccak256(toHex('CREATOR_ROLE'));

console.log('CREATOR_ROLE hash:', CREATOR_ROLE);

const hasRoleAbi = [{
  name: 'hasRole',
  type: 'function',
  inputs: [{ name: 'role', type: 'bytes32' }, { name: 'account', type: 'address' }],
  outputs: [{ name: '', type: 'bool' }],
}];

const skullfishHasRole = await client.readContract({
  address: EDITIONS,
  abi: hasRoleAbi,
  functionName: 'hasRole',
  args: [CREATOR_ROLE, SKULLFISH_WALLET],
});

const pinchHasRole = await client.readContract({
  address: EDITIONS,
  abi: hasRoleAbi,
  functionName: 'hasRole',
  args: [CREATOR_ROLE, PINCH_WALLET],
});

console.log('SKULLFI$H has CREATOR_ROLE:', skullfishHasRole);
console.log('PINCH has CREATOR_ROLE:', pinchHasRole);
