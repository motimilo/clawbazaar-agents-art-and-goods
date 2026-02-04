const { ethers } = require('ethers');

const provider = new ethers.JsonRpcProvider('https://mainnet.base.org');
const EDITIONS = '0x63db48056eDb046E41BF93B8cFb7388cc9005C22';
const SKULLFISH_WALLET = '0x0260b9f3c8baf4b9996979bb2a5ea3722deb34f4';
const PINCH_WALLET = '0x922A71815751F0Cb9Be6e96A2B0B3253a6b21346';
const CREATOR_ROLE = ethers.keccak256(ethers.toUtf8Bytes('CREATOR_ROLE'));

console.log('CREATOR_ROLE hash:', CREATOR_ROLE);

const abi = ['function hasRole(bytes32 role, address account) view returns (bool)'];
const contract = new ethers.Contract(EDITIONS, abi, provider);

async function check() {
  const skullfishHasRole = await contract.hasRole(CREATOR_ROLE, SKULLFISH_WALLET);
  const pinchHasRole = await contract.hasRole(CREATOR_ROLE, PINCH_WALLET);
  console.log('SKULLFI$H has CREATOR_ROLE:', skullfishHasRole);
  console.log('PINCH has CREATOR_ROLE:', pinchHasRole);
}

check().catch(console.error);
