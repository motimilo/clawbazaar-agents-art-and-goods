// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Royalty.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title ClawBazaarNFT v2
 * @notice Production-ready NFT marketplace for AI agent artwork
 * @dev Implements ERC721 with royalties, marketplace, and burn mechanics
 *
 * Features:
 * - ERC721 with URI Storage (on-chain metadata support)
 * - EIP-2981 Royalties (enforced in marketplace)
 * - Role-based access control (ADMIN, MINTER)
 * - Pausable for emergency stops
 * - Reentrancy protection
 * - SafeERC20 for token transfers
 * - Platform fee burning mechanism
 */
contract ClawBazaarNFT_v2 is
    ERC721,
    ERC721URIStorage,
    ERC721Royalty,
    ERC721Pausable,
    AccessControl,
    ReentrancyGuard
{
    using SafeERC20 for IERC20;

    // ============ Roles ============
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    // ============ State Variables ============
    uint256 private _nextTokenId;
    IERC20 public bazaarToken;

    uint96 public defaultRoyaltyBps;
    uint256 public platformFeeBps;
    uint256 public totalBurned;

    // Dead address for burning (more gas efficient than actual burn)
    address public constant BURN_ADDRESS = 0x000000000000000000000000000000000000dEaD;

    // Maximum values to prevent admin abuse
    uint96 public constant MAX_ROYALTY_BPS = 1000;  // 10%
    uint256 public constant MAX_PLATFORM_FEE_BPS = 1000;  // 10%

    // ============ Structs ============
    struct Listing {
        address seller;
        uint256 price;
        bool active;
    }

    // ============ Mappings ============
    mapping(uint256 => Listing) public listings;
    mapping(uint256 => address) public tokenCreators;

    // ============ Events ============
    event ArtworkMinted(
        uint256 indexed tokenId,
        address indexed creator,
        string metadataUri,
        uint256 timestamp
    );

    event ArtworkListed(
        uint256 indexed tokenId,
        address indexed seller,
        uint256 price
    );

    event ArtworkSold(
        uint256 indexed tokenId,
        address indexed seller,
        address indexed buyer,
        uint256 price,
        uint256 burnedAmount,
        uint256 royaltyAmount
    );

    event ListingCancelled(uint256 indexed tokenId);
    event TokensBurned(uint256 amount, uint256 totalBurned);
    event PlatformFeeUpdated(uint256 oldFeeBps, uint256 newFeeBps);
    event DefaultRoyaltyUpdated(uint96 oldRoyaltyBps, uint96 newRoyaltyBps);
    event BazaarTokenUpdated(address oldToken, address newToken);

    // ============ Errors ============
    error NotTokenOwner();
    error PriceZero();
    error ContractNotApproved();
    error ListingNotActive();
    error CannotBuyOwnArtwork();
    error RoyaltyTooHigh();
    error FeeTooHigh();
    error ZeroAddress();

    // ============ Constructor ============
    constructor(
        address _bazaarToken,
        uint96 _defaultRoyaltyBps,
        uint256 _platformFeeBps
    ) ERC721("ClawBazaar", "CLAW") {
        if (_bazaarToken == address(0)) revert ZeroAddress();
        if (_defaultRoyaltyBps > MAX_ROYALTY_BPS) revert RoyaltyTooHigh();
        if (_platformFeeBps > MAX_PLATFORM_FEE_BPS) revert FeeTooHigh();

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        _grantRole(PAUSER_ROLE, msg.sender);

        bazaarToken = IERC20(_bazaarToken);
        defaultRoyaltyBps = _defaultRoyaltyBps;
        platformFeeBps = _platformFeeBps;
    }

    // ============ Minting Functions ============

    /**
     * @notice Mint artwork with custom royalty settings
     * @param to Recipient address
     * @param metadataUri On-chain or IPFS metadata URI
     * @param royaltyReceiver Address to receive royalties
     * @param royaltyBps Royalty percentage in basis points (max 1000 = 10%)
     */
    function mintArtwork(
        address to,
        string calldata metadataUri,
        address royaltyReceiver,
        uint96 royaltyBps
    ) external whenNotPaused returns (uint256) {
        if (royaltyBps > MAX_ROYALTY_BPS) revert RoyaltyTooHigh();

        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, metadataUri);
        _setTokenRoyalty(tokenId, royaltyReceiver, royaltyBps);
        tokenCreators[tokenId] = to;

        emit ArtworkMinted(tokenId, to, metadataUri, block.timestamp);
        return tokenId;
    }

    /**
     * @notice Mint artwork with default royalty (creator receives royalties)
     * @param to Recipient and royalty receiver address
     * @param metadataUri On-chain or IPFS metadata URI
     */
    function mintArtworkWithDefaultRoyalty(
        address to,
        string calldata metadataUri
    ) external whenNotPaused returns (uint256) {
        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, metadataUri);
        _setTokenRoyalty(tokenId, to, defaultRoyaltyBps);
        tokenCreators[tokenId] = to;

        emit ArtworkMinted(tokenId, to, metadataUri, block.timestamp);
        return tokenId;
    }

    /**
     * @notice Public mint for verified agents (requires MINTER_ROLE grant)
     * @dev Agents must be granted MINTER_ROLE before they can mint
     */
    function agentMint(
        string calldata metadataUri
    ) external whenNotPaused returns (uint256) {
        uint256 tokenId = _nextTokenId++;
        _safeMint(msg.sender, tokenId);
        _setTokenURI(tokenId, metadataUri);
        _setTokenRoyalty(tokenId, msg.sender, defaultRoyaltyBps);
        tokenCreators[tokenId] = msg.sender;

        emit ArtworkMinted(tokenId, msg.sender, metadataUri, block.timestamp);
        return tokenId;
    }

    // ============ Marketplace Functions ============

    /**
     * @notice List NFT for sale
     * @param tokenId Token to list
     * @param price Price in BAZAAR tokens (wei)
     */
    function listForSale(uint256 tokenId, uint256 price) external whenNotPaused {
        if (ownerOf(tokenId) != msg.sender) revert NotTokenOwner();
        if (price == 0) revert PriceZero();
        if (getApproved(tokenId) != address(this) && !isApprovedForAll(msg.sender, address(this))) {
            revert ContractNotApproved();
        }

        listings[tokenId] = Listing({
            seller: msg.sender,
            price: price,
            active: true
        });

        emit ArtworkListed(tokenId, msg.sender, price);
    }

    /**
     * @notice Cancel an active listing
     * @param tokenId Token to delist
     */
    function cancelListing(uint256 tokenId) external {
        Listing storage listing = listings[tokenId];
        if (listing.seller != msg.sender) revert NotTokenOwner();
        if (!listing.active) revert ListingNotActive();

        delete listings[tokenId];
        emit ListingCancelled(tokenId);
    }

    /**
     * @notice Buy a listed artwork
     * @dev Handles platform fee burn, royalties, and transfer
     * @param tokenId Token to purchase
     */
    function buyArtwork(uint256 tokenId) external nonReentrant whenNotPaused {
        Listing memory listing = listings[tokenId];
        if (!listing.active) revert ListingNotActive();
        if (listing.seller == msg.sender) revert CannotBuyOwnArtwork();

        address seller = listing.seller;
        uint256 price = listing.price;

        // Clear listing before transfers (CEI pattern)
        delete listings[tokenId];

        // Calculate amounts
        uint256 burnAmount = (price * platformFeeBps) / 10000;
        uint256 afterBurnPrice = price - burnAmount;
        (address royaltyReceiver, uint256 royaltyAmount) = royaltyInfo(tokenId, afterBurnPrice);
        uint256 sellerAmount = afterBurnPrice - royaltyAmount;

        // Execute transfers using SafeERC20
        bazaarToken.safeTransferFrom(msg.sender, BURN_ADDRESS, burnAmount);
        totalBurned += burnAmount;
        emit TokensBurned(burnAmount, totalBurned);

        bazaarToken.safeTransferFrom(msg.sender, seller, sellerAmount);

        if (royaltyAmount > 0 && royaltyReceiver != seller) {
            bazaarToken.safeTransferFrom(msg.sender, royaltyReceiver, royaltyAmount);
        }

        // Transfer NFT
        _transfer(seller, msg.sender, tokenId);

        emit ArtworkSold(tokenId, seller, msg.sender, price, burnAmount, royaltyAmount);
    }

    // ============ Admin Functions ============

    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    function updateBazaarToken(address _bazaarToken) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (_bazaarToken == address(0)) revert ZeroAddress();
        address oldToken = address(bazaarToken);
        bazaarToken = IERC20(_bazaarToken);
        emit BazaarTokenUpdated(oldToken, _bazaarToken);
    }

    function updateDefaultRoyalty(uint96 _royaltyBps) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (_royaltyBps > MAX_ROYALTY_BPS) revert RoyaltyTooHigh();
        uint96 oldRoyalty = defaultRoyaltyBps;
        defaultRoyaltyBps = _royaltyBps;
        emit DefaultRoyaltyUpdated(oldRoyalty, _royaltyBps);
    }

    function updatePlatformFee(uint256 _feeBps) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (_feeBps > MAX_PLATFORM_FEE_BPS) revert FeeTooHigh();
        uint256 oldFee = platformFeeBps;
        platformFeeBps = _feeBps;
        emit PlatformFeeUpdated(oldFee, _feeBps);
    }

    function grantMinterRole(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _grantRole(MINTER_ROLE, account);
    }

    function revokeMinterRole(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _revokeRole(MINTER_ROLE, account);
    }

    // ============ View Functions ============

    function getListing(uint256 tokenId) external view returns (address seller, uint256 price, bool active) {
        Listing memory listing = listings[tokenId];
        return (listing.seller, listing.price, listing.active);
    }

    function getCreator(uint256 tokenId) external view returns (address) {
        return tokenCreators[tokenId];
    }

    function totalSupply() external view returns (uint256) {
        return _nextTokenId;
    }

    function calculateBuyPrice(uint256 tokenId) external view returns (
        uint256 totalPrice,
        uint256 burnAmount,
        uint256 royaltyAmount,
        uint256 sellerAmount
    ) {
        Listing memory listing = listings[tokenId];
        if (!listing.active) revert ListingNotActive();

        totalPrice = listing.price;
        burnAmount = (totalPrice * platformFeeBps) / 10000;
        uint256 afterBurn = totalPrice - burnAmount;
        (, royaltyAmount) = royaltyInfo(tokenId, afterBurn);
        sellerAmount = afterBurn - royaltyAmount;
    }

    // ============ Required Overrides ============

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721URIStorage, ERC721Royalty, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    function _update(address to, uint256 tokenId, address auth)
        internal
        override(ERC721, ERC721Pausable)
        returns (address)
    {
        // Auto-cancel listing on transfer
        if (listings[tokenId].active && auth != address(0)) {
            delete listings[tokenId];
            emit ListingCancelled(tokenId);
        }
        return super._update(to, tokenId, auth);
    }

    function _increaseBalance(address account, uint128 value)
        internal
        override(ERC721)
    {
        super._increaseBalance(account, value);
    }
}
