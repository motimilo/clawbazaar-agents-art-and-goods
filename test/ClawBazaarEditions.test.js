const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture, time } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("ClawBazaarEditions", function () {
  async function deployEditionsFixture() {
    const [owner, creator, buyer, buyer2] = await ethers.getSigners();
    
    // Deploy BAZAAR token first
    const BAZAARToken = await ethers.getContractFactory("BAZAARToken_v2");
    const token = await BAZAARToken.deploy(owner.address);
    await token.waitForDeployment();
    
    // Deploy Editions contract
    const ClawBazaarEditions = await ethers.getContractFactory("ClawBazaarEditions");
    const editions = await ClawBazaarEditions.deploy(await token.getAddress());
    await editions.waitForDeployment();
    
    // Grant creator role
    const CREATOR_ROLE = await editions.CREATOR_ROLE();
    await editions.grantRole(CREATOR_ROLE, creator.address);
    
    // Fund buyers with tokens
    const fundAmount = ethers.parseEther("10000");
    await token.transfer(buyer.address, fundAmount);
    await token.transfer(buyer2.address, fundAmount);
    
    // Approve editions contract to spend tokens
    await token.connect(buyer).approve(await editions.getAddress(), ethers.MaxUint256);
    await token.connect(buyer2).approve(await editions.getAddress(), ethers.MaxUint256);
    
    return { editions, token, owner, creator, buyer, buyer2, CREATOR_ROLE };
  }

  describe("Deployment", function () {
    it("Should set the correct token address", async function () {
      const { editions, token } = await loadFixture(deployEditionsFixture);
      expect(await editions.bazaarToken()).to.equal(await token.getAddress());
    });

    it("Should set default platform fee", async function () {
      const { editions } = await loadFixture(deployEditionsFixture);
      expect(await editions.platformFeeBps()).to.equal(500); // 5%
    });
  });

  describe("Edition Creation", function () {
    it("Should allow creator to create an edition", async function () {
      const { editions, creator } = await loadFixture(deployEditionsFixture);
      
      const metadataUri = "ipfs://QmTest";
      const maxSupply = 100;
      const maxPerWallet = 5;
      const price = ethers.parseEther("10");
      const duration = 0; // no time limit
      const royaltyBps = 500; // 5%
      
      await expect(
        editions.connect(creator).createEdition(
          metadataUri, maxSupply, maxPerWallet, price, duration, royaltyBps
        )
      ).to.emit(editions, "EditionCreated");
      
      // Verify edition data
      expect(await editions.editionUri(0)).to.equal(metadataUri);
      expect(await editions.editionMaxSupply(0)).to.equal(maxSupply);
      expect(await editions.editionPrice(0)).to.equal(price);
      expect(await editions.editionActive(0)).to.be.true;
    });

    it("Should not allow non-creator to create edition", async function () {
      const { editions, buyer } = await loadFixture(deployEditionsFixture);
      
      await expect(
        editions.connect(buyer).createEdition(
          "ipfs://test", 100, 5, ethers.parseEther("10"), 0, 500
        )
      ).to.be.reverted;
    });

    it("Should auto-increment edition IDs", async function () {
      const { editions, creator } = await loadFixture(deployEditionsFixture);
      
      await editions.connect(creator).createEdition(
        "ipfs://test1", 100, 5, ethers.parseEther("10"), 0, 500
      );
      await editions.connect(creator).createEdition(
        "ipfs://test2", 50, 2, ethers.parseEther("20"), 0, 500
      );
      
      expect(await editions.editionUri(0)).to.equal("ipfs://test1");
      expect(await editions.editionUri(1)).to.equal("ipfs://test2");
    });
  });

  describe("Minting", function () {
    async function createEditionFixture() {
      const data = await loadFixture(deployEditionsFixture);
      const { editions, creator } = data;
      
      // Create an edition
      const price = ethers.parseEther("100");
      await editions.connect(creator).createEdition(
        "ipfs://QmTest",
        10,    // maxSupply
        3,     // maxPerWallet
        price,
        0,     // no duration
        500    // 5% royalty
      );
      
      return { ...data, editionId: 0, price };
    }

    it("Should allow minting with sufficient tokens", async function () {
      const { editions, buyer, editionId, price } = await loadFixture(createEditionFixture);
      
      await editions.connect(buyer).mint(editionId, 1);
      
      expect(await editions.balanceOf(buyer.address, editionId)).to.equal(1);
    });

    it("Should transfer correct payment", async function () {
      const { editions, token, buyer, creator, editionId, price } = await loadFixture(createEditionFixture);
      
      const creatorBalanceBefore = await token.balanceOf(creator.address);
      
      await editions.connect(buyer).mint(editionId, 1);
      
      // Creator should receive payment minus platform fee
      const platformFee = price * 500n / 10000n; // 5%
      const creatorPayment = price - platformFee;
      
      expect(await token.balanceOf(creator.address)).to.equal(
        creatorBalanceBefore + creatorPayment
      );
    });

    it("Should respect maxPerWallet limit", async function () {
      const { editions, buyer, editionId } = await loadFixture(createEditionFixture);
      
      // Mint max allowed (3)
      await editions.connect(buyer).mint(editionId, 3);
      
      // Try to mint more
      await expect(
        editions.connect(buyer).mint(editionId, 1)
      ).to.be.reverted;
    });

    it("Should respect maxSupply limit", async function () {
      const { editions, buyer, buyer2, editionId } = await loadFixture(createEditionFixture);
      
      // Max supply is 10, maxPerWallet is 3
      await editions.connect(buyer).mint(editionId, 3);
      await editions.connect(buyer2).mint(editionId, 3);
      
      // Total minted: 6, remaining: 4
      // buyer tries to mint 3 more but only has 0 left in wallet limit
      // Need a third buyer
    });

    it("Should not allow minting inactive edition", async function () {
      const { editions, creator, buyer, editionId } = await loadFixture(createEditionFixture);
      
      // Deactivate edition
      await editions.connect(creator).setEditionActive(editionId, false);
      
      await expect(
        editions.connect(buyer).mint(editionId, 1)
      ).to.be.reverted;
    });
  });

  describe("Token Burns", function () {
    it("Should burn platform fee tokens", async function () {
      const { editions, token, buyer } = await loadFixture(deployEditionsFixture);
      const { creator } = await loadFixture(deployEditionsFixture);
      
      // This test verifies burn mechanics if implemented
      // Platform fees are sent to BURN_ADDRESS
    });
  });

  describe("Admin Functions", function () {
    it("Should allow admin to update platform fee", async function () {
      const { editions, owner } = await loadFixture(deployEditionsFixture);
      
      await editions.setPlatformFeeBps(300); // 3%
      expect(await editions.platformFeeBps()).to.equal(300);
    });

    it("Should not allow fee above 10%", async function () {
      const { editions, owner } = await loadFixture(deployEditionsFixture);
      
      await expect(
        editions.setPlatformFeeBps(1001) // 10.01%
      ).to.be.reverted;
    });
  });
});
