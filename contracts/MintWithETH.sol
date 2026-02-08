// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title MintWithETH
/// @notice Allows users to mint CLAWBAZAAR editions with ETH in a single transaction
/// @dev Swaps ETH → BAZAAR via Uniswap, then mints the edition
contract MintWithETH is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // Uniswap V3 SwapRouter on Base
    address public constant SWAP_ROUTER = 0x2626664c2603336E57B271c5C0b26F421741e481;
    
    // WETH on Base
    address public constant WETH = 0x4200000000000000000000000000000000000006;
    
    // $BAZAAR token
    address public constant BAZAAR = 0xdA15854Df692c0c4415315909E69D44E54F76B07;
    
    // ClawBazaar Editions contract
    address public immutable editions;
    
    // Pool fee (0.3% = 3000, 1% = 10000)
    uint24 public poolFee = 10000; // 1% fee tier
    
    // Slippage tolerance in basis points (500 = 5%)
    uint256 public slippageBps = 500;

    event MintedWithETH(
        address indexed buyer,
        uint256 indexed editionId,
        uint256 quantity,
        uint256 ethSpent,
        uint256 bazaarUsed
    );

    constructor(address _editions) Ownable(msg.sender) {
        editions = _editions;
    }

    /// @notice Mint an edition by paying with ETH
    /// @param editionId The edition to mint
    /// @param quantity How many to mint
    /// @param minBazaarOut Minimum BAZAAR to receive from swap (slippage protection)
    function mintWithETH(
        uint256 editionId,
        uint256 quantity,
        uint256 minBazaarOut
    ) external payable nonReentrant {
        require(msg.value > 0, "Must send ETH");
        require(quantity > 0, "Quantity must be > 0");

        // Get edition price
        uint256 pricePerUnit = IEditions(editions).editionPrice(editionId);
        uint256 totalBazaarNeeded = pricePerUnit * quantity;

        // Swap ETH → BAZAAR via Uniswap
        uint256 bazaarReceived = _swapETHForBAZAAR(msg.value, minBazaarOut);
        
        require(bazaarReceived >= totalBazaarNeeded, "Insufficient BAZAAR received");

        // Approve editions contract to spend BAZAAR
        IERC20(BAZAAR).approve(editions, totalBazaarNeeded);

        // Mint the edition
        IEditions(editions).mint(editionId, quantity);

        // Transfer minted NFT to buyer (editions contract sends to msg.sender of mint call, which is this contract)
        // We need to transfer the NFT to the actual buyer
        IEditions(editions).safeTransferFrom(
            address(this),
            msg.sender,
            editionId,
            quantity,
            ""
        );

        // Refund excess BAZAAR if any
        uint256 bazaarLeft = bazaarReceived - totalBazaarNeeded;
        if (bazaarLeft > 0) {
            IERC20(BAZAAR).safeTransfer(msg.sender, bazaarLeft);
        }

        emit MintedWithETH(msg.sender, editionId, quantity, msg.value, totalBazaarNeeded);
    }

    /// @notice Swap ETH for BAZAAR using Uniswap V3
    function _swapETHForBAZAAR(uint256 ethAmount, uint256 minOut) internal returns (uint256) {
        // Encode the path: WETH -> BAZAAR
        bytes memory path = abi.encodePacked(WETH, poolFee, BAZAAR);

        ISwapRouter.ExactInputParams memory params = ISwapRouter.ExactInputParams({
            path: path,
            recipient: address(this),
            deadline: block.timestamp + 300, // 5 minutes
            amountIn: ethAmount,
            amountOutMinimum: minOut
        });

        // Execute swap (router will wrap ETH to WETH)
        uint256 amountOut = ISwapRouter(SWAP_ROUTER).exactInput{value: ethAmount}(params);
        
        return amountOut;
    }

    /// @notice Get quote for minting with ETH
    /// @param editionId The edition to mint
    /// @param quantity How many to mint
    /// @return bazaarNeeded Amount of BAZAAR needed
    function getQuote(uint256 editionId, uint256 quantity) external view returns (uint256 bazaarNeeded) {
        uint256 pricePerUnit = IEditions(editions).editionPrice(editionId);
        bazaarNeeded = pricePerUnit * quantity;
    }

    /// @notice Update pool fee tier
    function setPoolFee(uint24 _poolFee) external onlyOwner {
        poolFee = _poolFee;
    }

    /// @notice Update slippage tolerance
    function setSlippage(uint256 _slippageBps) external onlyOwner {
        require(_slippageBps <= 2000, "Slippage too high"); // Max 20%
        slippageBps = _slippageBps;
    }

    /// @notice Rescue stuck tokens
    function rescueTokens(address token, uint256 amount) external onlyOwner {
        IERC20(token).safeTransfer(owner(), amount);
    }

    /// @notice Rescue stuck ETH
    function rescueETH() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }

    /// @notice Required for receiving ERC1155 tokens
    function onERC1155Received(
        address,
        address,
        uint256,
        uint256,
        bytes calldata
    ) external pure returns (bytes4) {
        return this.onERC1155Received.selector;
    }

    function onERC1155BatchReceived(
        address,
        address,
        uint256[] calldata,
        uint256[] calldata,
        bytes calldata
    ) external pure returns (bytes4) {
        return this.onERC1155BatchReceived.selector;
    }

    receive() external payable {}
}

/// @notice Interface for Uniswap V3 SwapRouter
interface ISwapRouter {
    struct ExactInputParams {
        bytes path;
        address recipient;
        uint256 deadline;
        uint256 amountIn;
        uint256 amountOutMinimum;
    }

    function exactInput(ExactInputParams calldata params) external payable returns (uint256 amountOut);
}

/// @notice Interface for ClawBazaar Editions
interface IEditions {
    function editionPrice(uint256 editionId) external view returns (uint256);
    function mint(uint256 editionId, uint256 quantity) external;
    function safeTransferFrom(
        address from,
        address to,
        uint256 id,
        uint256 amount,
        bytes calldata data
    ) external;
}
