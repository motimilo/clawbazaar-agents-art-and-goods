// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Royalty.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Permit.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IBurnableERC20 is IERC20 {
    function burn(uint256 amount) external;
}

contract ClawBazaarNFT is ERC721, ERC721URIStorage, ERC721Royalty, AccessControl, ReentrancyGuard {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    uint256 private _nextTokenId;
    IBurnableERC20 public bazaarToken;
    uint96 public defaultRoyaltyBps = 500;
    uint256 public platformFeeBps = 500;
    address public constant BURN_ADDRESS = 0x000000000000000000000000000000000000dEaD;

    uint256 public totalBurned;

    struct Listing {
        address seller;
        uint256 price;
        bool active;
    }

    mapping(uint256 => Listing) public listings;
    mapping(uint256 => address) public tokenCreators;

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
        uint256 burnedAmount
    );

    event ListingCancelled(uint256 indexed tokenId);

    event TokensBurned(uint256 amount, uint256 totalBurned);

    event PlatformFeeUpdated(uint256 oldFeeBps, uint256 newFeeBps);

    constructor(address _bazaarToken) ERC721("ClawBazaar", "CLAWBAZAAR") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        bazaarToken = IBurnableERC20(_bazaarToken);
    }

    function mintArtwork(
        address to,
        string memory metadataUri,
        address royaltyReceiver,
        uint96 royaltyBps
    ) external returns (uint256) {
        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, metadataUri);
        _setTokenRoyalty(tokenId, royaltyReceiver, royaltyBps);
        tokenCreators[tokenId] = to;

        emit ArtworkMinted(tokenId, to, metadataUri, block.timestamp);

        return tokenId;
    }

    function mintArtworkWithDefaultRoyalty(
        address to,
        string memory metadataUri
    ) external returns (uint256) {
        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, metadataUri);
        _setTokenRoyalty(tokenId, to, defaultRoyaltyBps);
        tokenCreators[tokenId] = to;

        emit ArtworkMinted(tokenId, to, metadataUri, block.timestamp);

        return tokenId;
    }

    function listForSale(uint256 tokenId, uint256 price) external {
        require(ownerOf(tokenId) == msg.sender, "Not the owner");
        require(price > 0, "Price must be greater than 0");
        require(
            getApproved(tokenId) == address(this) || isApprovedForAll(msg.sender, address(this)),
            "Contract not approved"
        );

        listings[tokenId] = Listing({
            seller: msg.sender,
            price: price,
            active: true
        });

        emit ArtworkListed(tokenId, msg.sender, price);
    }

    function cancelListing(uint256 tokenId) external {
        require(listings[tokenId].seller == msg.sender, "Not the seller");
        require(listings[tokenId].active, "Listing not active");

        delete listings[tokenId];

        emit ListingCancelled(tokenId);
    }

    function buyArtwork(uint256 tokenId) external nonReentrant {
        Listing memory listing = listings[tokenId];
        require(listing.active, "Not listed for sale");
        require(listing.seller != msg.sender, "Cannot buy own artwork");

        address seller = listing.seller;
        uint256 price = listing.price;

        delete listings[tokenId];

        uint256 burnAmount = (price * platformFeeBps) / 10000;
        uint256 afterBurnPrice = price - burnAmount;

        (address royaltyReceiver, uint256 royaltyAmount) = royaltyInfo(tokenId, afterBurnPrice);
        uint256 sellerAmount = afterBurnPrice - royaltyAmount;

        require(
            bazaarToken.transferFrom(msg.sender, BURN_ADDRESS, burnAmount),
            "Burn transfer failed"
        );
        totalBurned += burnAmount;
        emit TokensBurned(burnAmount, totalBurned);

        require(
            bazaarToken.transferFrom(msg.sender, seller, sellerAmount),
            "Payment to seller failed"
        );

        if (royaltyAmount > 0 && royaltyReceiver != seller) {
            require(
                bazaarToken.transferFrom(msg.sender, royaltyReceiver, royaltyAmount),
                "Royalty payment failed"
            );
        }

        _transfer(seller, msg.sender, tokenId);

        emit ArtworkSold(tokenId, seller, msg.sender, price, burnAmount);
    }

    function updateBazaarToken(address _bazaarToken) external onlyRole(DEFAULT_ADMIN_ROLE) {
        bazaarToken = IBurnableERC20(_bazaarToken);
    }

    function updateDefaultRoyalty(uint96 _royaltyBps) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_royaltyBps <= 1000, "Royalty too high");
        defaultRoyaltyBps = _royaltyBps;
    }

    function updatePlatformFee(uint256 _feeBps) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_feeBps <= 2000, "Fee too high");
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
        require(listing.active, "Not listed");

        totalPrice = listing.price;
        burnAmount = (totalPrice * platformFeeBps) / 10000;
        uint256 afterBurn = totalPrice - burnAmount;

        (, royaltyAmount) = royaltyInfo(tokenId, afterBurn);
        sellerAmount = afterBurn - royaltyAmount;
    }

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
        override(ERC721)
        returns (address)
    {
        if (listings[tokenId].active && auth != address(0)) {
            delete listings[tokenId];
        }
        return super._update(to, tokenId, auth);
    }
}
