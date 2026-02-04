import {
  createPublicClient,
  createWalletClient,
  decodeEventLog,
  http,
  parseAbi,
  type Hash,
  type Address,
  type Account,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base, baseSepolia } from "viem/chains";
import { getConfig } from "./config.js";

const NFT_ABI = parseAbi([
  "function mintArtwork(address to, string metadataUri, address royaltyReceiver, uint96 royaltyBps) external returns (uint256)",
  "function mintArtworkWithDefaultRoyalty(address to, string metadataUri) external returns (uint256)",
  "function listForSale(uint256 tokenId, uint256 price) external",
  "function cancelListing(uint256 tokenId) external",
  "function buyArtwork(uint256 tokenId) external",
  "function approve(address to, uint256 tokenId) external",
  "function setApprovalForAll(address operator, bool approved) external",
  "function totalSupply() external view returns (uint256)",
  "function ownerOf(uint256 tokenId) external view returns (address)",
  "function getListing(uint256 tokenId) external view returns (address seller, uint256 price, bool active)",
  "function calculateBuyPrice(uint256 tokenId) external view returns (uint256 totalPrice, uint256 burnAmount, uint256 royaltyAmount, uint256 sellerAmount)",
  "event ArtworkMinted(uint256 indexed tokenId, address indexed creator, string metadataUri, uint256 timestamp)",
]);

const ERC20_ABI = parseAbi([
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function balanceOf(address account) external view returns (uint256)",
  "function decimals() external view returns (uint8)",
]);

const EDITIONS_ABI = parseAbi([
  "function createEdition(string metadataUri,uint256 maxSupply,uint256 maxPerWallet,uint256 price,uint256 durationSeconds,uint96 royaltyBps) external returns (uint256)",
  "function mint(uint256 editionId,uint256 amount) external",
  "function editionPrice(uint256 editionId) external view returns (uint256)",
  "function bazaarToken() external view returns (address)",
  "event EditionCreated(uint256 indexed editionId,address indexed creator,uint256 maxSupply,uint256 price)",
  "event EditionMinted(uint256 indexed editionId,address indexed minter,uint256 amount,uint256 totalPaid)",
]);

export function getChain() {
  const config = getConfig();
  if (config.rpcUrl.includes("sepolia")) {
    return baseSepolia;
  }
  return base;
}

export function getPublicClient() {
  const config = getConfig();
  return createPublicClient({
    chain: getChain(),
    transport: http(config.rpcUrl),
  });
}

export function getWalletClient(privateKey: string): ReturnType<typeof createWalletClient> {
  const config = getConfig();
  const account = privateKeyToAccount(privateKey as `0x${string}`);
  return createWalletClient({
    account,
    chain: getChain(),
    transport: http(config.rpcUrl),
  });
}

export function getAccountFromPrivateKey(privateKey: string): Account {
  return privateKeyToAccount(privateKey as `0x${string}`);
}

export async function mintNft(
  privateKey: string,
  metadataUri: string
): Promise<{ hash: Hash; tokenId: number }> {
  const config = getConfig();
  const account = getAccountFromPrivateKey(privateKey);
  const walletClient = getWalletClient(privateKey);
  const publicClient = getPublicClient();

  const hash = await walletClient.writeContract({
    address: config.nftContractAddress as Address,
    abi: NFT_ABI,
    functionName: "mintArtworkWithDefaultRoyalty",
    args: [account.address, metadataUri],
    chain: getChain(),
    account,
  });

  const receipt = await publicClient.waitForTransactionReceipt({ hash });

  let tokenId = 0;
  for (const log of receipt.logs) {
    try {
      const event = {
        address: log.address,
        topics: log.topics,
        data: log.data,
      };
      if (log.topics[0] === "0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925") {
        continue;
      }
      if (log.topics[1]) {
        tokenId = parseInt(log.topics[1], 16);
        break;
      }
    } catch {
      continue;
    }
  }

  if (tokenId === 0) {
    const totalSupply = await publicClient.readContract({
      address: config.nftContractAddress as Address,
      abi: NFT_ABI,
      functionName: "totalSupply",
    });
    tokenId = Number(totalSupply) - 1;
  }

  return { hash, tokenId };
}

export async function listNftForSale(
  privateKey: string,
  tokenId: number,
  priceInWei: bigint
): Promise<Hash> {
  const config = getConfig();
  const account = getAccountFromPrivateKey(privateKey);
  const walletClient = getWalletClient(privateKey);
  const publicClient = getPublicClient();

  const approveHash = await walletClient.writeContract({
    address: config.nftContractAddress as Address,
    abi: NFT_ABI,
    functionName: "approve",
    args: [config.nftContractAddress as Address, BigInt(tokenId)],
    chain: getChain(),
    account,
  });
  await publicClient.waitForTransactionReceipt({ hash: approveHash });

  const hash = await walletClient.writeContract({
    address: config.nftContractAddress as Address,
    abi: NFT_ABI,
    functionName: "listForSale",
    args: [BigInt(tokenId), priceInWei],
    chain: getChain(),
    account,
  });

  await publicClient.waitForTransactionReceipt({ hash });

  return hash;
}

export async function cancelNftListing(
  privateKey: string,
  tokenId: number
): Promise<Hash> {
  const config = getConfig();
  const account = getAccountFromPrivateKey(privateKey);
  const walletClient = getWalletClient(privateKey);
  const publicClient = getPublicClient();

  const hash = await walletClient.writeContract({
    address: config.nftContractAddress as Address,
    abi: NFT_ABI,
    functionName: "cancelListing",
    args: [BigInt(tokenId)],
    chain: getChain(),
    account,
  });

  await publicClient.waitForTransactionReceipt({ hash });

  return hash;
}

export async function getBalance(address: string): Promise<bigint> {
  const publicClient = getPublicClient();
  return publicClient.getBalance({ address: address as Address });
}

export function formatEther(wei: bigint): string {
  return (Number(wei) / 1e18).toFixed(6);
}

export async function getBzaarBalance(address: string): Promise<bigint> {
  const config = getConfig();
  const publicClient = getPublicClient();

  return publicClient.readContract({
    address: config.bzaarTokenAddress as Address,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [address as Address],
  });
}

export async function getListing(tokenId: number): Promise<{ seller: Address; price: bigint; active: boolean }> {
  const config = getConfig();
  const publicClient = getPublicClient();

  const [seller, price, active] = await publicClient.readContract({
    address: config.nftContractAddress as Address,
    abi: NFT_ABI,
    functionName: "getListing",
    args: [BigInt(tokenId)],
  });

  return { seller, price, active };
}

export async function createEditionOnChain(
  privateKey: string,
  metadataUri: string,
  maxSupply: number,
  maxPerWallet: number,
  priceWei: bigint,
  durationHours: number | undefined,
  royaltyBps: number,
  contractAddress?: string,
): Promise<{ hash: Hash; editionId: number }> {
  const config = getConfig();
  const editionsAddress =
    (contractAddress || config.editionsContractAddress) as Address;
  if (!editionsAddress) {
    throw new Error("Missing editions contract address");
  }

  const account = getAccountFromPrivateKey(privateKey);
  const walletClient = getWalletClient(privateKey);
  const publicClient = getPublicClient();
  const durationSeconds = durationHours ? Math.floor(durationHours * 3600) : 0;

  const hash = await walletClient.writeContract({
    address: editionsAddress,
    abi: EDITIONS_ABI,
    functionName: "createEdition",
    args: [
      metadataUri,
      BigInt(maxSupply),
      BigInt(maxPerWallet),
      priceWei,
      BigInt(durationSeconds),
      BigInt(royaltyBps),
    ],
    chain: getChain(),
    account,
  });

  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  let editionId = 0;
  for (const log of receipt.logs) {
    if (log.address.toLowerCase() !== editionsAddress.toLowerCase()) continue;
    try {
      const decoded = decodeEventLog({
        abi: EDITIONS_ABI,
        data: log.data,
        topics: log.topics,
      });
      if (decoded.eventName === "EditionCreated") {
        editionId = Number(decoded.args.editionId);
        break;
      }
    } catch {
      continue;
    }
  }

  if (editionId === 0) {
    throw new Error("Failed to read editionId from transaction logs");
  }

  return { hash, editionId };
}

export async function mintEditionOnChain(
  privateKey: string,
  editionIdOnChain: number,
  amount: number,
  contractAddress?: string,
): Promise<Hash> {
  const config = getConfig();
  const editionsAddress =
    (contractAddress || config.editionsContractAddress) as Address;
  if (!editionsAddress) {
    throw new Error("Missing editions contract address");
  }

  const account = getAccountFromPrivateKey(privateKey);
  const walletClient = getWalletClient(privateKey);
  const publicClient = getPublicClient();

  const pricePer = await publicClient.readContract({
    address: editionsAddress,
    abi: EDITIONS_ABI,
    functionName: "editionPrice",
    args: [BigInt(editionIdOnChain)],
  });
  const tokenAddress = await publicClient.readContract({
    address: editionsAddress,
    abi: EDITIONS_ABI,
    functionName: "bazaarToken",
  });
  const totalPrice = BigInt(pricePer) * BigInt(amount);

  if (totalPrice > 0n) {
    const allowance = await publicClient.readContract({
      address: tokenAddress as Address,
      abi: ERC20_ABI,
      functionName: "allowance",
      args: [account.address as Address, editionsAddress],
    });

    if (allowance < totalPrice) {
      const approveHash = await walletClient.writeContract({
        address: tokenAddress as Address,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [editionsAddress, totalPrice],
        chain: getChain(),
        account,
      });
      await publicClient.waitForTransactionReceipt({ hash: approveHash });
    }
  }

  const hash = await walletClient.writeContract({
    address: editionsAddress,
    abi: EDITIONS_ABI,
    functionName: "mint",
    args: [BigInt(editionIdOnChain), BigInt(amount)],
    chain: getChain(),
    account,
  });

  await publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

export async function calculateBuyPrice(tokenId: number): Promise<{
  totalPrice: bigint;
  burnAmount: bigint;
  royaltyAmount: bigint;
  sellerAmount: bigint;
}> {
  const config = getConfig();
  const publicClient = getPublicClient();

  const [totalPrice, burnAmount, royaltyAmount, sellerAmount] = await publicClient.readContract({
    address: config.nftContractAddress as Address,
    abi: NFT_ABI,
    functionName: "calculateBuyPrice",
    args: [BigInt(tokenId)],
  });

  return { totalPrice, burnAmount, royaltyAmount, sellerAmount };
}

export async function buyNft(
  privateKey: string,
  tokenId: number,
  price: bigint
): Promise<Hash> {
  const config = getConfig();
  const walletClient = getWalletClient(privateKey);
  const publicClient = getPublicClient();
  const account = getAccountFromPrivateKey(privateKey);

  const allowance = await publicClient.readContract({
    address: config.bzaarTokenAddress as Address,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: [account.address, config.nftContractAddress as Address],
  });

  if (allowance < price) {
    const approveHash = await walletClient.writeContract({
      address: config.bzaarTokenAddress as Address,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [config.nftContractAddress as Address, price],
      chain: getChain(),
      account,
    });
    await publicClient.waitForTransactionReceipt({ hash: approveHash });
  }

  const hash = await walletClient.writeContract({
    address: config.nftContractAddress as Address,
    abi: NFT_ABI,
    functionName: "buyArtwork",
    args: [BigInt(tokenId)],
    chain: getChain(),
    account,
  });

  await publicClient.waitForTransactionReceipt({ hash });

  return hash;
}
