// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";

/**
 * @title BAZAARToken v2
 * @notice Production-ready ERC20 token for ClawBazaar marketplace
 * @dev Implements standard ERC20 with burn, permit, and pause capabilities
 *
 * Features:
 * - ERC20Burnable: Allows token burning (deflationary mechanism)
 * - ERC20Permit: Gasless approvals (EIP-2612)
 * - ERC20Pausable: Emergency pause capability
 * - Ownable2Step: Two-step ownership transfer for safety
 * - Fixed max supply: 1 billion tokens
 */
contract BAZAARToken_v2 is ERC20, ERC20Burnable, ERC20Permit, ERC20Pausable, Ownable2Step {
    /// @notice Maximum supply: 1 billion tokens
    uint256 public constant MAX_SUPPLY = 1_000_000_000 * 10**18;

    /// @notice Emitted when tokens are minted (only at construction)
    event TokensMinted(address indexed to, uint256 amount);

    /**
     * @notice Constructor - mints entire supply to deployer
     * @param initialOwner Address to receive initial supply and ownership
     */
    constructor(address initialOwner)
        ERC20("BAZAAR", "BAZAAR")
        ERC20Permit("BAZAAR")
        Ownable(initialOwner)
    {
        _mint(initialOwner, MAX_SUPPLY);
        emit TokensMinted(initialOwner, MAX_SUPPLY);
    }

    /**
     * @notice Token decimals (standard 18)
     */
    function decimals() public pure override returns (uint8) {
        return 18;
    }

    /**
     * @notice Pause all token transfers
     * @dev Only owner can pause
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Resume token transfers
     * @dev Only owner can unpause
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @notice Returns circulating supply (total supply minus burned)
     * @dev Burned tokens are removed from total supply via ERC20Burnable
     */
    function circulatingSupply() external view returns (uint256) {
        return totalSupply();
    }

    /**
     * @notice Returns amount of tokens burned
     */
    function totalBurned() external view returns (uint256) {
        return MAX_SUPPLY - totalSupply();
    }

    // ============ Required Overrides ============

    function _update(address from, address to, uint256 value)
        internal
        override(ERC20, ERC20Pausable)
    {
        super._update(from, to, value);
    }
}
