// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Supply.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IBurnableERC20 is IERC20 {
    function burn(uint256 amount) external;
}

contract ClawBazaarEditions is ERC1155, ERC1155Supply, AccessControl, ReentrancyGuard {
    bytes32 public constant CREATOR_ROLE = keccak256("CREATOR_ROLE");

    IBurnableERC20 public bazaarToken;
    uint256 public platformFeeBps = 500;
    address public constant BURN_ADDRESS = 0x000000000000000000000000000000000000dEaD;
    uint256 public totalBurned;
    uint256 private _nextEditionId;

    mapping(uint256 => address) public editionCreator;
    mapping(uint256 => uint256) public editionMaxSupply;
    mapping(uint256 => uint256) public editionMaxPerWallet;
    mapping(uint256 => uint256) public editionPrice;
    mapping(uint256 => uint256) public editionMintEnd;
    mapping(uint256 => bool) public editionActive;
    mapping(uint256 => string) public editionUri;
    mapping(uint256 => uint96) public editionRoyaltyBps;
    mapping(uint256 => mapping(address => uint256)) public mintsPerWallet;

    struct Listing {
        uint256 price;
        uint256 amount;
    }
    mapping(uint256 => mapping(address => Listing)) public listings;

    event EditionCreated(uint256 indexed editionId, address indexed creator, uint256 maxSupply, uint256 price);
    event EditionMinted(uint256 indexed editionId, address indexed minter, uint256 amount, uint256 totalPaid);
    event EditionClosed(uint256 indexed editionId, uint256 totalMinted);
    event EditionListed(uint256 indexed editionId, address indexed seller, uint256 amount, uint256 price);
    event EditionSold(uint256 indexed editionId, address indexed seller, address indexed buyer, uint256 amount, uint256 totalPrice, uint256 burned);
    event ListingCancelled(uint256 indexed editionId, address indexed seller);
    event TokensBurned(uint256 amount, uint256 totalBurned);

    constructor(address _bazaarToken) ERC1155("") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(CREATOR_ROLE, msg.sender);
        bazaarToken = IBurnableERC20(_bazaarToken);
    }

    function createEdition(
        string calldata metadataUri,
        uint256 maxSupply,
        uint256 maxPerWallet,
        uint256 price,
        uint256 durationSeconds,
        uint96 royaltyBps
    ) external onlyRole(CREATOR_ROLE) returns (uint256) {
        require(maxSupply > 0 && maxSupply <= 1000, "Invalid supply");
        require(price > 0, "Price must be > 0");
        require(royaltyBps <= 1000, "Royalty too high");

        uint256 editionId = _nextEditionId++;

        editionCreator[editionId] = msg.sender;
        editionMaxSupply[editionId] = maxSupply;
        editionMaxPerWallet[editionId] = maxPerWallet > 0 ? maxPerWallet : maxSupply;
        editionPrice[editionId] = price;
        editionMintEnd[editionId] = durationSeconds > 0 ? block.timestamp + durationSeconds : 0;
        editionActive[editionId] = true;
        editionUri[editionId] = metadataUri;
        editionRoyaltyBps[editionId] = royaltyBps;

        emit EditionCreated(editionId, msg.sender, maxSupply, price);
        return editionId;
    }

    function mint(uint256 editionId, uint256 amount) external nonReentrant {
        require(editionActive[editionId], "Edition not active");
        require(amount > 0, "Amount must be > 0");

        uint256 mintEnd = editionMintEnd[editionId];
        if (mintEnd > 0) {
            require(block.timestamp <= mintEnd, "Minting ended");
        }

        uint256 currentSupply = totalSupply(editionId);
        require(currentSupply + amount <= editionMaxSupply[editionId], "Exceeds max supply");

        uint256 walletMints = mintsPerWallet[editionId][msg.sender];
        require(walletMints + amount <= editionMaxPerWallet[editionId], "Exceeds wallet limit");

        uint256 totalPrice = editionPrice[editionId] * amount;
        require(bazaarToken.transferFrom(msg.sender, editionCreator[editionId], totalPrice), "Payment failed");

        mintsPerWallet[editionId][msg.sender] = walletMints + amount;
        _mint(msg.sender, editionId, amount, "");

        emit EditionMinted(editionId, msg.sender, amount, totalPrice);

        if (totalSupply(editionId) >= editionMaxSupply[editionId]) {
            editionActive[editionId] = false;
            emit EditionClosed(editionId, totalSupply(editionId));
        }
    }

    function closeEdition(uint256 editionId) external {
        require(editionCreator[editionId] == msg.sender || hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "Not authorized");
        require(editionActive[editionId], "Already closed");

        editionActive[editionId] = false;
        emit EditionClosed(editionId, totalSupply(editionId));
    }

    function listForSale(uint256 editionId, uint256 amount, uint256 pricePerToken) external {
        require(balanceOf(msg.sender, editionId) >= amount, "Insufficient balance");
        require(amount > 0, "Amount must be > 0");
        require(pricePerToken > 0, "Price must be > 0");
        require(isApprovedForAll(msg.sender, address(this)), "Contract not approved");

        listings[editionId][msg.sender] = Listing(pricePerToken, amount);
        emit EditionListed(editionId, msg.sender, amount, pricePerToken);
    }

    function cancelListing(uint256 editionId) external {
        require(listings[editionId][msg.sender].amount > 0, "No active listing");
        delete listings[editionId][msg.sender];
        emit ListingCancelled(editionId, msg.sender);
    }

    function buyFromListing(uint256 editionId, address seller, uint256 amount) external nonReentrant {
        Listing storage listing = listings[editionId][seller];
        require(listing.amount >= amount && amount > 0, "Invalid amount");
        require(seller != msg.sender, "Cannot buy own listing");
        require(balanceOf(seller, editionId) >= amount, "Seller insufficient balance");

        uint256 totalPrice = listing.price * amount;
        uint256 burnAmount = (totalPrice * platformFeeBps) / 10000;
        uint256 afterBurn = totalPrice - burnAmount;
        uint256 royaltyAmount = (afterBurn * editionRoyaltyBps[editionId]) / 10000;
        uint256 sellerAmount = afterBurn - royaltyAmount;

        require(bazaarToken.transferFrom(msg.sender, BURN_ADDRESS, burnAmount), "Burn failed");
        totalBurned += burnAmount;
        emit TokensBurned(burnAmount, totalBurned);

        require(bazaarToken.transferFrom(msg.sender, seller, sellerAmount), "Payment failed");

        address creator = editionCreator[editionId];
        if (royaltyAmount > 0 && creator != seller) {
            require(bazaarToken.transferFrom(msg.sender, creator, royaltyAmount), "Royalty failed");
        }

        _safeTransferFrom(seller, msg.sender, editionId, amount, "");

        listing.amount -= amount;
        if (listing.amount == 0) {
            delete listings[editionId][seller];
        }

        emit EditionSold(editionId, seller, msg.sender, amount, totalPrice, burnAmount);
    }

    function uri(uint256 editionId) public view override returns (string memory) {
        return editionUri[editionId];
    }

    function totalEditions() external view returns (uint256) {
        return _nextEditionId;
    }

    function getListing(uint256 editionId, address seller) external view returns (uint256 price, uint256 amount) {
        Listing storage l = listings[editionId][seller];
        return (l.price, l.amount);
    }

    function updateBazaarToken(address _bazaarToken) external onlyRole(DEFAULT_ADMIN_ROLE) {
        bazaarToken = IBurnableERC20(_bazaarToken);
    }

    function updatePlatformFee(uint256 _feeBps) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_feeBps <= 1000, "Fee too high");
        platformFeeBps = _feeBps;
    }

    function grantCreatorRole(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _grantRole(CREATOR_ROLE, account);
    }

    function revokeCreatorRole(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _revokeRole(CREATOR_ROLE, account);
    }

    function _update(address from, address to, uint256[] memory ids, uint256[] memory values) internal override(ERC1155, ERC1155Supply) {
        super._update(from, to, ids, values);
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC1155, AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
