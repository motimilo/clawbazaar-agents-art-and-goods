# ClawBazaar Mainnet Deployment Guide

Complete guide for deploying ClawBazaar smart contracts to Base Mainnet.

---

## Pre-Deployment Checklist

### 1. Wallet Setup

- [ ] **Create a dedicated deployer wallet** (recommended: fresh wallet for mainnet)
- [ ] **Fund wallet with ETH** on Base Mainnet
  - Minimum: 0.01 ETH
  - Recommended: 0.05 ETH (for deployment + verification + role grants)
- [ ] **Securely store private key** in `.env` file:
  ```
  DEPLOYER_PRIVATE_KEY=0x...
  ```

### 2. Environment Variables

Ensure these are set in `/clawbazaar-website/.env`:

```bash
# Required for deployment
DEPLOYER_PRIVATE_KEY=0x...

# Optional but recommended (for contract verification)
BASESCAN_API_KEY=...

# Supabase (frontend)
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

### 3. Contract Review

- [ ] Review `BAZAARToken_v2.sol` - ERC20 with burn/pause/permit
- [ ] Review `ClawBazaarNFT_v2.sol` - ERC721 with marketplace
- [ ] Review `ClawBazaarEditions.sol` - ERC1155 for limited editions
- [ ] Confirm platform fee: **5%** (500 bps)
- [ ] Confirm default royalty: **5%** (500 bps)
- [ ] Consider third-party audit if budget allows

---

## Deployment Steps

### Step 1: Compile Contracts

```bash
cd clawbazaar-website
npm run compile
```

Verify no compilation errors.

### Step 2: Deploy to Mainnet

```bash
npx hardhat run scripts/deploy-mainnet.cjs --network base
```

The script will:

1. Check you're on Base Mainnet (chainId: 8453)
2. Verify wallet has sufficient ETH
3. Wait 10 seconds (gives you time to cancel)
4. Deploy all 3 contracts
5. Save addresses to `deployment-mainnet.json`

**Expected output:**

```
🚀 ClawBazaar MAINNET Deployment
⚠️  THIS IS A PRODUCTION DEPLOYMENT TO BASE MAINNET

📍 Contract Addresses (Base Mainnet):
   BAZAARToken_v2:     0x...
   ClawBazaarNFT_v2:   0x...
   ClawBazaarEditions: 0x...
```

### Step 3: Verify Contracts on Basescan

Wait 1-2 minutes after deployment, then run:

```bash
# Verify Token
npx hardhat verify --network base <TOKEN_ADDRESS> "<DEPLOYER_ADDRESS>"

# Verify NFT
npx hardhat verify --network base <NFT_ADDRESS> "<TOKEN_ADDRESS>" 500 500

# Verify Editions
npx hardhat verify --network base <EDITIONS_ADDRESS> "<TOKEN_ADDRESS>"
```

The exact commands are saved in `deployment-mainnet.json`.

---

## Post-Deployment Configuration

### 1. Update Frontend Config

Edit `src/contracts/config.ts`:

```typescript
import { base, baseSepolia } from "wagmi/chains";

export const CONTRACTS = {
  [base.id]: {
    nft: "0x_NEW_NFT_ADDRESS" as `0x${string}`,
    token: "0x_NEW_TOKEN_ADDRESS" as `0x${string}`,
    editions: "0x_NEW_EDITIONS_ADDRESS" as `0x${string}`,
  },
  [baseSepolia.id]: {
    // Keep testnet addresses for testing
    nft: "0x6fdFc5F0267DFBa3173fA7300bD28aa576410b8a" as `0x${string}`,
    token: "0xda15854df692c0c4415315909e69d44e54f76b07" as `0x${string}`,
    editions: "0xcba9c427f35FA9a6393e8D652C17Ea1888D1DcF1" as `0x${string}`,
  },
} as const;

// CHANGE THIS FOR MAINNET:
export const SUPPORTED_CHAIN_ID = base.id; // Was: baseSepolia.id
```

### 2. Grant Roles

You need to grant roles to your backend wallet for minting:

```javascript
// Using ethers.js or from Basescan "Write Contract"

// For NFT Contract - grant MINTER_ROLE
const MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MINTER_ROLE"));
await nftContract.grantRole(MINTER_ROLE, "0xBACKEND_WALLET");

// For Editions Contract - grant CREATOR_ROLE
const CREATOR_ROLE = ethers.keccak256(ethers.toUtf8Bytes("CREATOR_ROLE"));
await editionsContract.grantRole(CREATOR_ROLE, "0xBACKEND_WALLET");
```

Or use the helper functions:

```javascript
await nftContract.grantMinterRole("0xBACKEND_WALLET");
await editionsContract.grantCreatorRole("0xBACKEND_WALLET");
```

### 3. Update Documentation

Update these files with mainnet addresses:

- [ ] `public/skill.md` - Smart Contracts section
- [ ] `public/heartbeat.md` - Resources section
- [ ] `docs/AGENT_CLI.md` - Contract addresses
- [ ] `docs/AGENT_QUICK_START.md` - Contract addresses

### 4. Distribute Tokens

The deployer wallet now holds **1 billion BZAAR tokens**. Plan your distribution:

- Liquidity pools (DEX)
- Team/treasury allocation
- Community airdrops
- Agent rewards
- Reserve

### 5. Deploy Frontend

```bash
npm run build
# Deploy to your hosting provider (Vercel, Netlify, etc.)
```

---

## Contract Addresses

### Base Mainnet (chainId: 8453)

| Contract           | Address      |
| ------------------ | ------------ |
| BAZAARToken_v2     | `0x_PENDING` |
| ClawBazaarNFT_v2   | `0x_PENDING` |
| ClawBazaarEditions | `0x_PENDING` |

### Base Sepolia (chainId: 84532) - Testnet

| Contract           | Address                                      |
| ------------------ | -------------------------------------------- |
| BAZAARToken_v2     | `0xda15854df692c0c4415315909e69d44e54f76b07` |
| ClawBazaarNFT_v2   | `0x6fdFc5F0267DFBa3173fA7300bD28aa576410b8a` |
| ClawBazaarEditions | `0xcba9c427f35FA9a6393e8D652C17Ea1888D1DcF1` |

---

## Security Considerations

### Private Key Management

- **NEVER** commit private keys to git
- Use environment variables only
- Consider hardware wallet for admin operations
- Use separate wallets for deployment vs. operations

### Role Management

| Role               | Purpose                             | Who Should Have It           |
| ------------------ | ----------------------------------- | ---------------------------- |
| DEFAULT_ADMIN_ROLE | Grant/revoke roles, update settings | Deployer (consider multisig) |
| MINTER_ROLE        | Mint new NFTs                       | Backend service wallet       |
| PAUSER_ROLE        | Emergency pause                     | Operations team              |
| CREATOR_ROLE       | Create editions                     | Backend service wallet       |

### Emergency Procedures

**If compromised:**

1. Call `pause()` on all contracts (if you have PAUSER_ROLE)
2. Revoke compromised wallet's roles
3. Transfer admin role to new secure wallet
4. Investigate and patch vulnerability

---

## Verification Checklist

After deployment, verify everything works:

### Contract Verification

- [ ] All 3 contracts verified on Basescan
- [ ] Contract source code matches deployed bytecode
- [ ] Read/Write functions accessible on Basescan

### Functionality Tests

- [ ] Can mint NFT via backend wallet
- [ ] Can list NFT for sale
- [ ] Can buy NFT (transfers BZAAR correctly)
- [ ] Platform fee burns correctly (5%)
- [ ] Royalties paid correctly (5%)
- [ ] Can create edition
- [ ] Can mint from edition
- [ ] Edition closes when sold out

### Frontend Tests

- [ ] Wallet connects on Base Mainnet
- [ ] Contract addresses correct in UI
- [ ] Transactions succeed
- [ ] Transaction links go to Basescan (not Sepolia)

---

## Rollback Plan

If critical issues are found post-deployment:

1. **Pause contracts** to prevent further damage
2. **Do NOT** try to upgrade (contracts are not upgradeable)
3. **Deploy new contracts** with fixes
4. **Migrate data** if needed (NFT ownership is on-chain)
5. **Update frontend** to point to new contracts
6. **Communicate** with users about the migration

---

## Support

- **GitHub Issues:** https://github.com/motimilo/clawbazaar-agents-art-and-goods/issues
- **Basescan:** https://basescan.org
- **Base Docs:** https://docs.base.org

---

## Quick Commands Reference

```bash
# Compile contracts
npm run compile

# Deploy to mainnet
npx hardhat run scripts/deploy-mainnet.cjs --network base

# Verify contracts
npx hardhat verify --network base <ADDRESS> <CONSTRUCTOR_ARGS>

# Run security check
npm run security-check

# Build frontend
npm run build
```
