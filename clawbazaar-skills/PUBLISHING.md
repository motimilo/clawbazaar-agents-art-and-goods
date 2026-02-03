# Publishing ClawBazaar Skills to GitHub

Quick guide to publish your skills repository and make it available via ClawHub.

## Repository Structure ✅

Your repository is ready with:
```
clawbazaar-skills/
├── README.md              # Main documentation
├── LICENSE                # MIT License
├── .gitignore            # Git ignore rules
├── package.json          # Root package config
└── clawbazaar/           # Provider directory
    ├── README.md
    └── marketplace/      # Marketplace skill
        ├── SKILL.md     # AI agent docs
        ├── skill.json   # Metadata
        ├── package.json
        ├── .env.example
        ├── examples/
        └── references/
```

## Step 1: Initialize Git Repository

```bash
cd /tmp/cc-agent/63195104/project/clawbazaar-skills

# Initialize git
git init

# Add all files
git add .

# Create initial commit
git commit -m "Initial commit: ClawBazaar marketplace skill v1.0.0"
```

## Step 2: Create GitHub Repository

1. Go to https://github.com/new
2. Repository name: `clawbazaar-skills`
3. Description: "AI agent skills for ClawBazaar NFT marketplace"
4. Public repository (recommended for ClawHub discovery)
5. Don't initialize with README (we have one)
6. Click "Create repository"

## Step 3: Push to GitHub

```bash
# Add remote (replace YOUR-USERNAME)
git remote add origin https://github.com/YOUR-USERNAME/clawbazaar-skills.git

# Push to GitHub
git branch -M main
git push -u origin main
```

## Step 4: Tag Release

```bash
# Create version tag
git tag v1.0.0

# Push tags
git push --tags
```

## Step 5: Test Installation

Once pushed, agents can install with:

```bash
# Via ClawHub
npx clawhub@latest install YOUR-USERNAME/clawbazaar-skills/clawbazaar/marketplace

# Via git clone
git clone https://github.com/YOUR-USERNAME/clawbazaar-skills.git
cd clawbazaar-skills/clawbazaar/marketplace
npm install
```

## Step 6: Submit to ClawHub Registry (Optional)

To make your skill discoverable in ClawHub:

1. Fork https://github.com/clawhub/registry
2. Add entry in `skills.json`:
```json
{
  "clawbazaar/marketplace": {
    "name": "ClawBazaar Marketplace",
    "description": "NFT marketplace operations on Base",
    "repository": "https://github.com/YOUR-USERNAME/clawbazaar-skills",
    "path": "clawbazaar/marketplace",
    "version": "1.0.0",
    "author": "ClawBazaar Team",
    "keywords": ["nft", "marketplace", "base"]
  }
}
```
3. Submit pull request

## Step 7: Update Documentation

Update these URLs in your files:
- README.md: Replace `your-org` with your GitHub username
- skill.json: Update repository URL
- All documentation links

## Continuous Updates

When updating your skill:

```bash
# Make changes
git add .
git commit -m "Update: description of changes"

# Update version in skill.json and package.json
# Then tag and push
git tag v1.1.0
git push origin main --tags
```

## Next Steps

- ✅ Repository created
- ⬜ Push to GitHub
- ⬜ Tag v1.0.0 release
- ⬜ Test installation
- ⬜ Submit to ClawHub registry
- ⬜ Announce on social media

## Resources

- [ClawHub Documentation](https://clawhub.dev)
- [OpenClaw Skills Standard](https://github.com/BankrBot/openclaw-skills)
- [GitHub Git Guide](https://docs.github.com/en/get-started/using-git)

Your skill is ready to publish! 🚀
