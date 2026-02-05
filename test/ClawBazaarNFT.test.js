const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("ClawBazaarNFT_v2", function () {
  async function deployNFTFixture() {
    const [owner, minter, seller, buyer] = await ethers.getSigners();
    
    // Deploy BAZAAR token
    const BAZAARToken = await ethers.getContractFactory("BAZAARToken_v2");
    const token = await BAZAARToken.deploy(owner.address);
    await token.waitForDeployment();
    
    // Deploy NFT contract
    const ClawBazaarNFT = await ethers.getContractFactory("ClawBazaarNFT_v2");
    const nft = await ClawBazaarNFT.deploy(await token.getAddress());
    await nft.waitForDeployment();
    
    // Grant minter role
    const MINTER_ROLE = await nft.MINTER_ROLE();
    await nft.grantRole(MINTER_ROLE, minter.address);
    
    // Fund buyer with tokens
    const fundAmount = ethers.parseEther("100000");
    await token.transfer(buyer.address, fundAmount);
    await token.connect(buyer).approve(await nft.getAddress(), ethers.MaxUint256);
    
    return { nft, token, owner, minter, seller, buyer, MINTER_ROLE };
  }

  describe("Deployment", function () {
    it("Should set the correct token address", async function () {
      const { nft, token } = await loadFixture(deployNFTFixture);
      expect(await nft.bazaarToken()).to.equal(await token.getAddress());
    });

    it("Should have correct name and symbol", async function () {
      const { nft } = await loadFixture(deployNFTFixture);
      expect(await nft.name()).to.equal("ClawBazaar");
      expect(await nft.symbol()).to.equal("CLAW");
    });

    it("Should set default royalty", async function () {
      const { nft } = await loadFixture(deployNFTFixture);
      expect(await nft.defaultRoyaltyBps()).to.equal(500); // 5%
    });
  });

  describe("Minting", function () {
    it("Should allow minter to mint NFT", async function () {
      const { nft, minter, seller } = await loadFixture(deployNFTFixture);
      
      const tokenUri = "ipfs://QmTestNFT";
      const royaltyBps = 750; // 7.5%
      
      await expect(
        nft.connect(minter).safeMint(seller.address, tokenUri, royaltyBps)
      ).to.emit(nft, "Transfer");
      
      expect(await nft.ownerOf(0)).to.equal(seller.address);
      expect(await nft.tokenURI(0)).to.equal(tokenUri);
    });

    it("Should not allow non-minter to mint", async function () {
      const { nft, seller } = await loadFixture(deployNFTFixture);
      
      await expect(
        nft.connect(seller).safeMint(seller.address, "ipfs://test", 500)
      ).to.be.reverted;
    });

    it("Should auto-increment token IDs", async function () {
      const { nft, minter, seller } = await loadFixture(deployNFTFixture);
      
      await nft.connect(minter).safeMint(seller.address, "ipfs://test1", 500);
      await nft.connect(minter).safeMint(seller.address, "ipfs://test2", 500);
      
      expect(await nft.tokenURI(0)).to.equal("ipfs://test1");
      expect(await nft.tokenURI(1)).to.equal("ipfs://test2");
    });

    it("Should set correct royalty info", async function () {
      const { nft, minter, seller } = await loadFixture(deployNFTFixture);
      
      const royaltyBps = 1000; // 10%
      await nft.connect(minter).safeMint(seller.address, "ipfs://test", royaltyBps);
      
      const salePrice = ethers.parseEther("1000");
      const [receiver, amount] = await nft.royaltyInfo(0, salePrice);
      
      expect(receiver).to.equal(seller.address);
      expect(amount).to.equal(salePrice * BigInt(royaltyBps) / 10000n);
    });
  });

  describe("Marketplace - Listing", function () {
    async function mintedNFTFixture() {
      const data = await loadFixture(deployNFTFixture);
      const { nft, minter, seller } = data;
      
      // Mint an NFT to seller
      await nft.connect(minter).safeMint(seller.address, "ipfs://test", 500);
      
      return { ...data, tokenId: 0 };
    }

    it("Should allow owner to list NFT", async function () {
      const { nft, seller, tokenId } = await loadFixture(mintedNFTFixture);
      
      const price = ethers.parseEther("500");
      
      // Approve NFT contract to transfer
      await nft.connect(seller).approve(await nft.getAddress(), tokenId);
      
      await expect(
        nft.connect(seller).listForSale(tokenId, price)
      ).to.emit(nft, "Listed");
      
      const listing = await nft.listings(tokenId);
      expect(listing.seller).to.equal(seller.address);
      expect(listing.price).to.equal(price);
      expect(listing.active).to.be.true;
    });

    it("Should not allow non-owner to list", async function () {
      const { nft, buyer, tokenId } = await loadFixture(mintedNFTFixture);
      
      await expect(
        nft.connect(buyer).listForSale(tokenId, ethers.parseEther("500"))
      ).to.be.reverted;
    });

    it("Should allow seller to delist", async function () {
      const { nft, seller, tokenId } = await loadFixture(mintedNFTFixture);
      
      const price = ethers.parseEther("500");
      await nft.connect(seller).approve(await nft.getAddress(), tokenId);
      await nft.connect(seller).listForSale(tokenId, price);
      
      await expect(
        nft.connect(seller).delist(tokenId)
      ).to.emit(nft, "Delisted");
      
      const listing = await nft.listings(tokenId);
      expect(listing.active).to.be.false;
    });
  });

  describe("Marketplace - Buying", function () {
    async function listedNFTFixture() {
      const data = await loadFixture(deployNFTFixture);
      const { nft, token, minter, seller, buyer } = data;
      
      // Mint NFT to seller
      await nft.connect(minter).safeMint(seller.address, "ipfs://test", 500);
      const tokenId = 0;
      
      // List it
      const price = ethers.parseEther("1000");
      await nft.connect(seller).approve(await nft.getAddress(), tokenId);
      await nft.connect(seller).listForSale(tokenId, price);
      
      return { ...data, tokenId, price };
    }

    it("Should allow purchase with sufficient tokens", async function () {
      const { nft, buyer, seller, tokenId, price } = await loadFixture(listedNFTFixture);
      
      await expect(
        nft.connect(buyer).buy(tokenId)
      ).to.emit(nft, "Sale");
      
      expect(await nft.ownerOf(tokenId)).to.equal(buyer.address);
    });

    it("Should transfer correct amounts", async function () {
      const { nft, token, buyer, seller, tokenId, price } = await loadFixture(listedNFTFixture);
      
      const sellerBalanceBefore = await token.balanceOf(seller.address);
      
      await nft.connect(buyer).buy(tokenId);
      
      // Calculate expected payment (price minus platform fee and royalties)
      const platformFeeBps = await nft.platformFeeBps();
      const platformFee = price * platformFeeBps / 10000n;
      
      // Royalty goes to original creator (seller in this case)
      const [, royaltyAmount] = await nft.royaltyInfo(tokenId, price);
      
      // Seller should receive: price - platformFee - royalty + royalty (they're the creator)
      // = price - platformFee
      const expectedSellerIncrease = price - platformFee;
      
      expect(await token.balanceOf(seller.address)).to.be.closeTo(
        sellerBalanceBefore + expectedSellerIncrease,
        ethers.parseEther("1") // Allow small variance for royalty handling
      );
    });

    it("Should not allow buying unlisted NFT", async function () {
      const { nft, minter, seller, buyer } = await loadFixture(deployNFTFixture);
      
      await nft.connect(minter).safeMint(seller.address, "ipfs://test", 500);
      
      await expect(
        nft.connect(buyer).buy(0)
      ).to.be.reverted;
    });
  });

  describe("Pausing", function () {
    it("Should allow admin to pause", async function () {
      const { nft, owner } = await loadFixture(deployNFTFixture);
      
      await nft.pause();
      expect(await nft.paused()).to.be.true;
    });

    it("Should block minting when paused", async function () {
      const { nft, owner, minter, seller } = await loadFixture(deployNFTFixture);
      
      await nft.pause();
      
      await expect(
        nft.connect(minter).safeMint(seller.address, "ipfs://test", 500)
      ).to.be.revertedWithCustomError(nft, "EnforcedPause");
    });
  });
});
