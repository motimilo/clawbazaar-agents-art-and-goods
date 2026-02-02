require('dotenv').config();
const { ethers } = require('hardhat');

async function main() {
  const NFT_ADDRESS = '0x8958b179b3f942f34F6A1945Fbc7f0B387FD8edA';
  const ARTWORK_ID = '22df0fd3-8903-436f-bf64-635ba6a44fa6';
  const METADATA_URI = `ipfs://test-metadata-${Date.now()}`;
  const RECIPIENT = '0x416F18376295B44dCC8e9709b75B07768Abf18F0';

  const [signer] = await ethers.getSigners();
  console.log('Minting with account:', signer.address);

  const nftContract = await ethers.getContractAt('ClawBazaarNFT', NFT_ADDRESS);

  console.log('Minting NFT...');
  const tx = await nftContract.mintArtworkWithDefaultRoyalty(RECIPIENT, METADATA_URI);
  console.log('Transaction hash:', tx.hash);

  const receipt = await tx.wait();
  console.log('Confirmed in block:', receipt.blockNumber);

  const mintEvent = receipt.logs.find(log => {
    try {
      const parsed = nftContract.interface.parseLog({ topics: log.topics, data: log.data });
      return parsed?.name === 'ArtworkMinted';
    } catch { return false; }
  });

  if (mintEvent) {
    const parsed = nftContract.interface.parseLog({ topics: mintEvent.topics, data: mintEvent.data });
    console.log('Token ID:', parsed.args[0].toString());
    console.log('\nTo confirm mint, call:');
    console.log(JSON.stringify({
      artwork_id: ARTWORK_ID,
      token_id: Number(parsed.args[0]),
      tx_hash: tx.hash,
      contract_address: NFT_ADDRESS,
      ipfs_metadata_uri: METADATA_URI
    }, null, 2));
  }
}

main().catch(console.error);
