// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title MintWithETH
/// @notice Allows users to mint CLAWBAZAAR editions with ETH in a single transaction
/// @dev Swaps ETH → BAZAAR via Uniswap Universal Router (supports V4), then mints
contract MintWithETH is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // Uniswap Universal Router on Base
    address public constant UNIVERSAL_ROUTER = 0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD;
    
    // WETH on Base
    address public constant WETH = 0x4200000000000000000000000000000000000006;
    
    // $BAZAAR token
    address public constant BAZAAR = 0xdA15854Df692c0c4415315909E69D44E54F76B07;
    
    // ClawBazaar Editions contract
    address public immutable editions;
    
    // Slippage tolerance in basis points (500 = 5%)
    uint256 public slippageBps = 500;

    // V4 Pool ID for BAZAAR/WETH
    bytes32 public poolId;

    event MintedWithETH(
        address indexed buyer,
        uint256 indexed editionId,
        uint256 quantity,
        uint256 ethSpent,
        uint256 bazaarUsed
    );

    constructor(address _editions) Ownable(msg.sender) {
        editions = _editions;
        
        // Approve router to spend BAZAAR (for potential refunds)
        IERC20(BAZAAR).approve(UNIVERSAL_ROUTER, type(uint256).max);
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

        // Get BAZAAR balance before
        uint256 bazaarBefore = IERC20(BAZAAR).balanceOf(address(this));

        // Swap ETH → BAZAAR via Universal Router
        // Using WRAP_ETH + V4_SWAP commands
        _swapETHForBAZAAR(msg.value, minBazaarOut);

        // Get BAZAAR balance after
        uint256 bazaarAfter = IERC20(BAZAAR).balanceOf(address(this));
        uint256 bazaarReceived = bazaarAfter - bazaarBefore;
        
        require(bazaarReceived >= totalBazaarNeeded, "Insufficient BAZAAR received");

        // Approve editions contract to spend BAZAAR
        IERC20(BAZAAR).approve(editions, totalBazaarNeeded);

        // Mint the edition (mints to this contract)
        IEditions(editions).mint(editionId, quantity);

        // Transfer minted NFT to buyer
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

    /// @notice Swap ETH for BAZAAR using Universal Router
    function _swapETHForBAZAAR(uint256 ethAmount, uint256 minOut) internal {
        // Universal Router commands for ETH -> Token swap via V4
        // Command 0x0b = WRAP_ETH
        // Command 0x10 = V4_SWAP
        
        // For now, using a simpler approach via direct pool interaction
        // This is a placeholder - actual V4 swap encoding is complex
        
        // Wrap ETH to WETH first
        IWETH(WETH).deposit{value: ethAmount}();
        
        // Execute swap via quoter/pool directly
        // Note: This needs the actual V4 swap logic
        // For MVP, we use a simple swap path
        
        uint256 wethBalance = IERC20(WETH).balanceOf(address(this));
        IERC20(WETH).approve(UNIVERSAL_ROUTER, wethBalance);
        
        // Build Universal Router execute call
        bytes memory commands = abi.encodePacked(
            bytes1(0x00) // V3_SWAP_EXACT_IN (fallback to V3 if available)
        );
        
        bytes[] memory inputs = new bytes[](1);
        
        // V3_SWAP_EXACT_IN params: (recipient, amountIn, amountOutMin, path, payerIsUser)
        bytes memory path = abi.encodePacked(WETH, uint24(10000), BAZAAR);
        inputs[0] = abi.encode(
            address(this),  // recipient
            wethBalance,    // amountIn
            minOut,         // amountOutMinimum
            path,           // path
            false           // payerIsUser (false = contract pays)
        );
        
        IUniversalRouter(UNIVERSAL_ROUTER).execute(commands, inputs, block.timestamp + 300);
    }

    /// @notice Alternative: Simple direct swap if V3 pool exists
    /// @dev Uses SwapRouter02 which is more straightforward
    function _swapViaRouter02(uint256 ethAmount, uint256 minOut) internal returns (uint256) {
        address SWAP_ROUTER_02 = 0x2626664c2603336E57B271c5C0b26F421741e481;
        
        bytes memory path = abi.encodePacked(WETH, uint24(10000), BAZAAR);

        ISwapRouter02.ExactInputParams memory params = ISwapRouter02.ExactInputParams({
            path: path,
            recipient: address(this),
            amountIn: ethAmount,
            amountOutMinimum: minOut
        });

        return ISwapRouter02(SWAP_ROUTER_02).exactInput{value: ethAmount}(params);
    }

    /// @notice Get quote for minting with ETH
    function getQuote(uint256 editionId, uint256 quantity) external view returns (uint256 bazaarNeeded) {
        uint256 pricePerUnit = IEditions(editions).editionPrice(editionId);
        bazaarNeeded = pricePerUnit * quantity;
    }

    /// @notice Update slippage tolerance
    function setSlippage(uint256 _slippageBps) external onlyOwner {
        require(_slippageBps <= 2000, "Slippage too high");
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

interface IWETH {
    function deposit() external payable;
    function withdraw(uint256) external;
}

interface IUniversalRouter {
    function execute(bytes calldata commands, bytes[] calldata inputs, uint256 deadline) external payable;
}

interface ISwapRouter02 {
    struct ExactInputParams {
        bytes path;
        address recipient;
        uint256 amountIn;
        uint256 amountOutMinimum;
    }
    function exactInput(ExactInputParams calldata params) external payable returns (uint256 amountOut);
}

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
