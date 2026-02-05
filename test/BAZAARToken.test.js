const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("BAZAARToken", function () {
  async function deployTokenFixture() {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    const BAZAARToken = await ethers.getContractFactory("BAZAARToken_v2");
    const token = await BAZAARToken.deploy(owner.address);
    await token.waitForDeployment();
    
    const MAX_SUPPLY = ethers.parseEther("1000000000"); // 1 billion
    
    return { token, owner, addr1, addr2, MAX_SUPPLY };
  }

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      const { token, owner } = await loadFixture(deployTokenFixture);
      expect(await token.owner()).to.equal(owner.address);
    });

    it("Should mint total supply to owner", async function () {
      const { token, owner, MAX_SUPPLY } = await loadFixture(deployTokenFixture);
      expect(await token.balanceOf(owner.address)).to.equal(MAX_SUPPLY);
    });

    it("Should have correct name and symbol", async function () {
      const { token } = await loadFixture(deployTokenFixture);
      expect(await token.name()).to.equal("BAZAAR");
      expect(await token.symbol()).to.equal("BAZAAR");
    });

    it("Should have 18 decimals", async function () {
      const { token } = await loadFixture(deployTokenFixture);
      expect(await token.decimals()).to.equal(18);
    });
  });

  describe("Transfers", function () {
    it("Should transfer tokens between accounts", async function () {
      const { token, owner, addr1, addr2 } = await loadFixture(deployTokenFixture);
      
      const amount = ethers.parseEther("1000");
      await token.transfer(addr1.address, amount);
      expect(await token.balanceOf(addr1.address)).to.equal(amount);
      
      await token.connect(addr1).transfer(addr2.address, amount);
      expect(await token.balanceOf(addr2.address)).to.equal(amount);
      expect(await token.balanceOf(addr1.address)).to.equal(0);
    });

    it("Should fail if sender doesn't have enough tokens", async function () {
      const { token, owner, addr1 } = await loadFixture(deployTokenFixture);
      const initialOwnerBalance = await token.balanceOf(owner.address);
      
      await expect(
        token.connect(addr1).transfer(owner.address, 1)
      ).to.be.revertedWithCustomError(token, "ERC20InsufficientBalance");
      
      expect(await token.balanceOf(owner.address)).to.equal(initialOwnerBalance);
    });
  });

  describe("Burning", function () {
    it("Should allow token holders to burn their tokens", async function () {
      const { token, owner } = await loadFixture(deployTokenFixture);
      
      const burnAmount = ethers.parseEther("1000");
      const initialBalance = await token.balanceOf(owner.address);
      
      await token.burn(burnAmount);
      
      expect(await token.balanceOf(owner.address)).to.equal(initialBalance - burnAmount);
    });

    it("Should fail to burn more than balance", async function () {
      const { token, addr1 } = await loadFixture(deployTokenFixture);
      
      await expect(
        token.connect(addr1).burn(1)
      ).to.be.revertedWithCustomError(token, "ERC20InsufficientBalance");
    });
  });

  describe("Pausing", function () {
    it("Should allow owner to pause", async function () {
      const { token, owner } = await loadFixture(deployTokenFixture);
      
      await token.pause();
      expect(await token.paused()).to.be.true;
    });

    it("Should block transfers when paused", async function () {
      const { token, owner, addr1 } = await loadFixture(deployTokenFixture);
      
      await token.pause();
      
      await expect(
        token.transfer(addr1.address, 100)
      ).to.be.revertedWithCustomError(token, "EnforcedPause");
    });

    it("Should allow transfers after unpause", async function () {
      const { token, owner, addr1 } = await loadFixture(deployTokenFixture);
      
      await token.pause();
      await token.unpause();
      
      const amount = ethers.parseEther("100");
      await token.transfer(addr1.address, amount);
      expect(await token.balanceOf(addr1.address)).to.equal(amount);
    });

    it("Should not allow non-owner to pause", async function () {
      const { token, addr1 } = await loadFixture(deployTokenFixture);
      
      await expect(
        token.connect(addr1).pause()
      ).to.be.revertedWithCustomError(token, "OwnableUnauthorizedAccount");
    });
  });

  describe("Permit (EIP-2612)", function () {
    it("Should have correct DOMAIN_SEPARATOR", async function () {
      const { token } = await loadFixture(deployTokenFixture);
      // Just verify it exists and is a bytes32
      const domainSeparator = await token.DOMAIN_SEPARATOR();
      expect(domainSeparator).to.have.length(66); // 0x + 64 hex chars
    });
  });
});
