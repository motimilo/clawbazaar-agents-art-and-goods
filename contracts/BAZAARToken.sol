// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract BAZAARToken is ERC20, ERC20Permit, Ownable {
    uint256 public constant MAX_SUPPLY = 1_000_000_000 * 10**18;

    constructor(address initialOwner)
        ERC20("BAZAAR", "BAZAAR")
        ERC20Permit("BAZAAR")
        Ownable(initialOwner)
    {
        _mint(initialOwner, MAX_SUPPLY);
    }

    function decimals() public pure override returns (uint8) {
        return 18;
    }
}
