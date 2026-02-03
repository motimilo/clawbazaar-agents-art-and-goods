import { ethers } from 'ethers';

const NFT_ADDRESS = '0x8958b179b3f942f34F6A1945Fbc7f0B387FD8edA';
const BAZAAR_ADDRESS = '0x9E109Db8d920117A55f0d6a038E8CdBbaBC3459C';
const SUPABASE_URL = process.env.CLAWBAZAAR_SUPABASE_URL || 'https://lwffgjkzqvbxqlvtkcex.supabase.co';
const SUPABASE_KEY = process.env.CLAWBAZAAR_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

const NFT_ABI = [
  'function mintArtwork(string memory tokenURI, uint256 price) public returns (uint256)',
  'function buyArtwork(uint256 tokenId) public',
  'function listArtwork(uint256 tokenId, uint256 price) public',
  'function ownerOf(uint256 tokenId) public view returns (address)',
  'event ArtworkMinted(uint256 indexed tokenId, address indexed creator, string tokenURI, uint256 price)'
];

const ERC20_ABI = [
  'function balanceOf(address account) public view returns (uint256)',
  'function approve(address spender, uint256 amount) public returns (bool)',
  'function transfer(address to, uint256 amount) public returns (bool)'
];

class TestAgent {
  private provider: ethers.providers.JsonRpcProvider;
  private wallet: ethers.Wallet;
  private nftContract: ethers.Contract;
  private tokenContract: ethers.Contract;

  constructor(privateKey: string) {
    this.provider = new ethers.providers.JsonRpcProvider('https://sepolia.base.org');
    this.wallet = new ethers.Wallet(privateKey, this.provider);

    this.nftContract = new ethers.Contract(NFT_ADDRESS, NFT_ABI, this.wallet);
    this.tokenContract = new ethers.Contract(BAZAAR_ADDRESS, ERC20_ABI, this.wallet);

    console.log(`Agent Wallet: ${this.wallet.address}`);
  }

  async checkBalances() {
    console.log('\nChecking balances...');
    const ethBalance = await this.provider.getBalance(this.wallet.address);
    const bzaarBalance = await this.tokenContract.balanceOf(this.wallet.address);

    console.log(`ETH: ${ethers.utils.formatEther(ethBalance)}`);
    console.log(`BAZAAR: ${ethers.utils.formatUnits(bzaarBalance, 18)}`);

    return {
      eth: ethBalance,
      bazaar: bzaarBalance
    };
  }

  async browseMarketplace() {
    console.log('\nBrowsing marketplace...');
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/artworks?is_listed=eq.true&order=created_at.desc&limit=10`,
      {
        headers: {
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'apikey': SUPABASE_KEY
        }
      }
    );

    const artworks = await response.json();
    console.log(`Found ${artworks.length} listed artworks`);

    for (const art of artworks) {
      console.log(`  #${art.token_id}: ${art.title} - ${art.price} BAZAAR`);
    }

    return artworks;
  }

  async mintArtwork(title: string, imageUrl: string, price: number) {
    console.log(`\nMinting: ${title}`);

    const metadata = {
      name: title,
      description: 'Created by autonomous agent',
      image: imageUrl,
      attributes: [
        { trait_type: 'Category', value: 'AI Art' },
        { trait_type: 'Creator', value: 'ClawBot' }
      ]
    };

    const metadataUri = `ipfs://metadata-${Date.now()}`;
    const priceWei = ethers.utils.parseUnits(price.toString(), 18);

    console.log('Submitting transaction...');
    const tx = await this.nftContract.mintArtwork(metadataUri, priceWei);
    console.log(`Tx Hash: ${tx.hash}`);

    const receipt = await tx.wait();
    console.log('Minted successfully!');

    const event = receipt.events?.find((e: any) => e.event === 'ArtworkMinted');
    const tokenId = event?.args?.tokenId.toNumber();

    console.log(`Token ID: ${tokenId}`);
    return tokenId;
  }

  async buyArtwork(tokenId: number) {
    console.log(`\nBuying artwork #${tokenId}`);

    const artworkResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/artworks?token_id=eq.${tokenId}`,
      {
        headers: {
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'apikey': SUPABASE_KEY
        }
      }
    );

    const artworks = await artworkResponse.json();
    if (!artworks.length) {
      throw new Error('Artwork not found');
    }

    const price = ethers.utils.parseUnits(artworks[0].price, 18);

    console.log(`Approving ${artworks[0].price} BAZAAR...`);
    const approveTx = await this.tokenContract.approve(NFT_ADDRESS, price);
    await approveTx.wait();

    console.log('Purchasing...');
    const buyTx = await this.nftContract.buyArtwork(tokenId);
    await buyTx.wait();

    console.log('Purchase successful!');
    return buyTx.hash;
  }
}

async function main() {
  const privateKey = process.env.AGENT_PRIVATE_KEY || process.env.CLOSEDSEA_PRIVATE_KEY;
  if (!privateKey) {
    console.error('Set AGENT_PRIVATE_KEY or CLOSEDSEA_PRIVATE_KEY environment variable');
    process.exit(1);
  }
  if (!SUPABASE_KEY) {
    console.error('Set CLAWBAZAAR_SUPABASE_ANON_KEY (or SUPABASE_ANON_KEY) environment variable');
    process.exit(1);
  }

  const agent = new TestAgent(privateKey);

  await agent.checkBalances();

  await agent.browseMarketplace();

  console.log('\n✓ Agent test successful!');
  console.log('\nNext steps:');
  console.log('  1. Ensure you have Base Sepolia ETH for gas');
  console.log('  2. Get BAZAAR tokens from the faucet');
  console.log('  3. Call agent.mintArtwork() to create NFTs');
  console.log('  4. Call agent.buyArtwork(tokenId) to purchase');
}

main().catch(console.error);
