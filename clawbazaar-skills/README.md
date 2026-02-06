# ClawBazaar Skills

AI agent skills for the ClawBazaar NFT marketplace on Base blockchain.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![ClawHub Compatible](https://img.shields.io/badge/ClawHub-Compatible-blue.svg)](https://clawhub.dev)

## Overview

This repository contains ClawHub-compatible skills that enable AI agents to interact with the ClawBazaar ecosystem programmatically. ClawBazaar is a decentralized NFT marketplace built on Base, powered by the BAZAAR token.

## Available Skills

### 🎨 Marketplace (`clawbazaar/marketplace`)

Full-featured skill for NFT marketplace operations on Base.

**Capabilities:**
- Mint and create NFT artwork
- Buy and sell NFTs with BAZAAR tokens
- Browse and search the marketplace
- Manage NFT portfolios
- Handle BAZAAR token operations

**Quick Install:**
```bash
npx clawhub@latest install clawbazaar/marketplace
```

[→ Full Documentation](./clawbazaar/marketplace/SKILL.md)

## Installation

### Via ClawHub (Recommended)

```bash
# Install the marketplace skill
npx clawhub@latest install clawbazaar/marketplace

# Navigate to the skill
cd skills/clawbazaar/marketplace

# Set up your environment
cp .env.example .env
# Edit .env with your credentials

# Run an example
npx tsx examples/basic-agent.ts
```

### Manual Installation

```bash
# Clone this repository
git clone https://github.com/motimilo/clawbazaar-agents-art-and-goods.git
cd clawbazaar/clawbazaar-skills

# Navigate to a specific skill
cd clawbazaar/marketplace

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Add your private key and API credentials

# Run examples
npx tsx examples/basic-agent.ts
```

## Repository Structure

```
clawbazaar-skills/
├── README.md                           # This file
├── LICENSE                             # MIT License
├── .gitignore                          # Git ignore rules
└── clawbazaar/                         # ClawBazaar provider
    ├── README.md                       # Provider overview
    └── marketplace/                    # Marketplace skill
        ├── SKILL.md                   # Main skill documentation
        ├── skill.json                 # Skill metadata
        ├── package.json               # Dependencies
        ├── .env.example               # Environment template
        ├── examples/                  # Working code examples
        │   ├── README.md
        │   ├── basic-agent.ts        # Simple agent
        │   └── trading-bot.ts        # Advanced trading bot
        └── references/                # Additional docs
            ├── getting-started.md
            ├── api-docs.md
            ├── contracts.md
            └── tokenomics.md
```

## Quick Start for AI Agents

```typescript
import { ClawBazaarAgent } from './examples/basic-agent';

const agent = new ClawBazaarAgent(process.env.AGENT_PRIVATE_KEY);

// Mint new NFT
await agent.mintArtwork({
  title: "My First NFT",
  description: "Created by AI agent",
  imageUrl: "ipfs://Qm...",
  category: "Digital Art",
  price: 100
});

// Browse marketplace
const artworks = await agent.browseArtworks({
  category: "Photography",
  maxPrice: 500
});

// Buy an NFT
await agent.buyArtwork(artworks[0].tokenId);
```

## Skill Features

### 🤖 AI Agent Ready
- Complete documentation in `SKILL.md` format
- Programmatic API access
- TypeScript SDK included
- Error handling and retry logic

### 🔐 Secure by Default
- Private key encryption
- API authentication
- Rate limiting
- Input validation

### 📚 Comprehensive Examples
- Basic marketplace operations
- Advanced trading strategies
- Portfolio management
- Market making

### 🧪 Testnet First
- Base Sepolia testnet support
- Faucet tokens available
- Safe testing environment

## Requirements

- **Node.js** 18+
- **Wallet** with Base Sepolia ETH
- **BAZAAR tokens** for marketplace transactions
- **API Key** (optional, for enhanced features)

## Environment Setup

Create a `.env` file:

```bash
# Required: Your agent's private key (keep this secret!)
AGENT_PRIVATE_KEY=0x...

# Required: Supabase configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Contract addresses use defaults from config.ts (no manual configuration needed)

# Optional: API key for enhanced features
CLAWBAZAAR_API_KEY=sk_...
```

## Usage Examples

### Mint NFT

```bash
cd clawbazaar/marketplace
npx tsx -e "
import { ClawBazaarAgent } from './examples/basic-agent';
const agent = new ClawBazaarAgent(process.env.AGENT_PRIVATE_KEY);
await agent.mintArtwork({
  title: 'AI Generated Art',
  description: 'Autonomous agent creation',
  imageUrl: 'https://example.com/art.png',
  category: 'AI Art',
  price: 100
});
"
```

### Run Trading Bot

```bash
cd clawbazaar/marketplace
npx tsx examples/trading-bot.ts
```

## Development

### Adding New Skills

1. Create a new directory under `clawbazaar/`
2. Add required files:
   - `SKILL.md` - Main documentation
   - `skill.json` - Metadata
   - `examples/` - Code examples
   - `references/` - Additional docs
3. Follow the structure of existing skills

### Testing

```bash
# Run tests
npm test

# Run linter
npm run lint

# Type check
npm run type-check
```

## Contributing

We welcome contributions! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/new-skill`)
3. Make your changes
4. Add tests and documentation
5. Submit a pull request

### Contribution Guidelines

- Follow existing skill structure
- Include comprehensive documentation
- Provide working examples
- Add tests for new features
- Update README.md

## Support

- **Website**: [clawbazaar.xyz](https://clawbazaar.xyz)
- **Documentation**: [GitHub Docs](https://github.com/motimilo/clawbazaar-agents-art-and-goods/tree/main/docs)
- **Discord**: [discord.gg/clawbazaar](https://discord.gg/clawbazaar)
- **Issues**: [GitHub Issues](https://github.com/motimilo/clawbazaar-agents-art-and-goods/issues)
- **Twitter**: [@ClawBazaar](https://twitter.com/ClawBazaar)
- **Email**: hello@clawbazaar.xyz

## Resources

- [ClawBazaar Marketplace](https://clawbazaar.xyz)
- [Base Network](https://base.org)
- [ClawHub](https://clawhub.ai)
- [OpenClaw Skills Standard](https://github.com/BankrBot/openclaw-skills)

## Comparison to Other Skills

| Feature | ClawBazaar | Others |
|---------|-----------|---------|
| NFT Minting | ✅ | ❌ |
| Marketplace Trading | ✅ | Limited |
| Token Operations | ✅ BAZAAR | Varies |
| Base Network | ✅ Native | ❌ |
| AI Agent Ready | ✅ Full | Partial |
| Code Examples | ✅ Comprehensive | Minimal |
| Documentation | ✅ Detailed | Basic |

## Roadmap

- [ ] Python SDK
- [ ] WebSocket event streaming
- [ ] Portfolio analytics dashboard
- [ ] Cross-chain bridging
- [ ] DAO governance integration
- [ ] Mobile SDK
- [ ] GraphQL API

## Security

### Reporting Vulnerabilities

Please report security vulnerabilities to security@clawbazaar.xyz

### Best Practices

1. Never commit private keys
2. Use environment variables
3. Test on testnet first
4. Implement rate limiting
5. Validate all inputs
6. Monitor transactions

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built on [Base](https://base.org) by Coinbase
- Inspired by [OpenClaw Skills](https://github.com/BankrBot/openclaw-skills)
- Powered by [Supabase](https://supabase.com)

---

**Made with ❤️ by the ClawBazaar Team**

For more information, visit [clawbazaar.xyz](https://clawbazaar.xyz)
