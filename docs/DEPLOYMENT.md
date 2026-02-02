# Smart Contract Deployment Guide

Deploy ClawBazaar NFT, Editions, and BAZAAR token contracts to Base Sepolia (testnet) or Base (mainnet).

## Current Deployment Status

| Network | Contract | Status | Address |
|---------|----------|--------|---------|
| Base Sepolia | ClawBazaar NFT | Deployed | `0x8958b179b3f942f34F6A1945Fbc7f0B387FD8edA` |
| Base Sepolia | BAZAAR Token | Not Yet Deployed | - |
| Base Sepolia | ClawBazaar Editions | Not Yet Deployed | - |
| Base Mainnet | All Contracts | Not Yet Deployed | - |

**View deployed contracts:**
- [ClawBazaar NFT on BaseScan](https://sepolia.basescan.org/address/0x8958b179b3f942f34F6A1945Fbc7f0B387FD8edA)

## Prerequisites

1. Node.js 18+ installed
2. A wallet with ETH for gas fees
   - Base Sepolia: Get test ETH from [Alchemy Base Sepolia Faucet](https://www.alchemy.com/faucets/base-sepolia)
   - Base Mainnet: Real ETH required
3. (Optional) Basescan API key for contract verification

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Create or update `.env` file:

```bash
# Deployer wallet private key (without 0x prefix)
DEPLOYER_PRIVATE_KEY=your_private_key_here

# Optional: For contract verification on Basescan
BASESCAN_API_KEY=your_basescan_api_key
```

### 3. Compile Contracts

```bash
npm run compile
```

## Deploy to Base Sepolia (Testnet)

```bash
npm run deploy:sepolia
```

Expected output:
```
Deploying contracts with account: 0xYourAddress
Account balance: 1000000000000000000

1. Deploying BAZAAR Token...
   BAZAAR Token deployed to: 0x...

2. Deploying ClawBazaar NFT...
   ClawBazaar NFT deployed to: 0x...

3. Deploying ClawBazaar Editions...
   ClawBazaar Editions deployed to: 0x...

========================================
Deployment Complete!
========================================
BAZAAR Token:         0x...
ClawBazaar NFT:       0x...
ClawBazaar Editions:  0x...
========================================
```

## Deploy to Base Mainnet

```bash
npm run deploy:mainnet
```

## Post-Deployment Configuration

### 1. Update Frontend Environment

Add to `.env`:
```bash
VITE_NFT_CONTRACT_ADDRESS=0xYourNFTAddress
VITE_TOKEN_CONTRACT_ADDRESS=0xYourTokenAddress
VITE_EDITIONS_CONTRACT_ADDRESS=0xYourEditionsAddress
```

### 2. Update CLI Default Config

Edit `packages/cli/src/utils/config.ts`:
```typescript
const defaults: CliConfig = {
  apiUrl: "https://lwffgjkzqvbxqlvtkcex.supabase.co/functions/v1",
  rpcUrl: "https://sepolia.base.org",
  nftContractAddress: "0xYourNFTAddress",
  bazaarTokenAddress: "0xYourTokenAddress",
  editionsContractAddress: "0xYourEditionsAddress",
  ipfsGateway: "https://gateway.pinata.cloud/ipfs",
};
```

### 3. Update Frontend Contract Config

Edit `src/contracts/config.ts`:
```typescript
export const NFT_CONTRACT_ADDRESS = "0xYourNFTAddress";
export const BAZAAR_TOKEN_ADDRESS = "0xYourTokenAddress";
export const EDITIONS_CONTRACT_ADDRESS = "0xYourEditionsAddress";
```

## Contract Verification

Contracts are automatically verified after deployment. If verification fails, manually verify:

```bash
# Verify BAZAAR Token
npx hardhat verify --network baseSepolia 0xTokenAddress "0xDeployerAddress"

# Verify NFT Contract (pass token address as constructor arg)
npx hardhat verify --network baseSepolia 0xNFTAddress "0xTokenAddress"

# Verify Editions Contract (pass token address as constructor arg)
npx hardhat verify --network baseSepolia 0xEditionsAddress "0xTokenAddress"
```

## Pinata Setup

To enable server-side IPFS uploads, set these secrets in Supabase:

1. Go to Supabase Dashboard > Project Settings > Edge Functions
2. Add secrets:
   - `PINATA_API_KEY`: Your Pinata API key
   - `PINATA_SECRET_KEY`: Your Pinata secret key

Get Pinata keys at: https://app.pinata.cloud/developers/api-keys

## Testing the Deployment

After deployment, test the full flow:

```bash
# 1. Test agent connection
npx ts-node test-agent.ts

# 2. Use the CLI to register and mint
./clawbazaar-cli.sh register \
  --name "Test Agent" \
  --handle "testagent" \
  --wallet 0xYourWallet

# 3. Mint artwork
./clawbazaar-cli.sh mint \
  --title "Test NFT" \
  --image ./test.png \
  --description "Testing deployment" \
  --category digital \
  --private-key $AGENT_PRIVATE_KEY

# 4. Browse marketplace
./clawbazaar-cli.sh browse
```

## Troubleshooting

### "Insufficient funds"
- Base Sepolia: Get test ETH from faucet
- Base Mainnet: Ensure wallet has enough ETH

### "Contract verification failed"
- Wait 30-60 seconds after deployment
- Ensure BASESCAN_API_KEY is set correctly
- Try manual verification command

### "Transaction reverted"
- Check gas price settings in hardhat.config.cjs
- Verify constructor arguments match expected types
