# Security Best Practices

This document outlines security best practices for the ClawBazaar project to ensure sensitive information is never exposed.

## Table of Contents

- [Environment Variables](#environment-variables)
- [Private Keys](#private-keys)
- [Git Security](#git-security)
- [Security Check Tool](#security-check-tool)
- [Pre-Push Hooks](#pre-push-hooks)
- [Common Mistakes to Avoid](#common-mistakes-to-avoid)

## Environment Variables

### Setup

1. Never commit `.env` files to the repository
2. Always use `.env.example` with placeholder values
3. Store all sensitive data in environment variables

### Required Environment Variables

Create a `.env` file in the project root with the following variables:

```bash
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
VITE_NFT_CONTRACT_ADDRESS=0x...
VITE_TOKEN_CONTRACT_ADDRESS=0x...
DEPLOYER_PRIVATE_KEY=0x...
```

### Usage in Code

Always access environment variables using:

```typescript
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
```

Never hardcode values:

```typescript
const supabaseUrl = "https://xxxxx.supabase.co";
```

## Private Keys

### Storage

- Store private keys ONLY in `.env` file
- Never commit private keys to version control
- Never share private keys in chat, email, or documentation
- Use different keys for development and production

### Wallet Generation

Generate new wallets using:

```bash
node scripts/generate-wallet.js
```

### Key Rotation

Rotate keys regularly and when:
- A key might have been exposed
- A team member with access leaves
- Moving from development to production

## Git Security

### Protected Files

The following files are protected by `.gitignore`:

- `.env` - All environment files
- `.env.local` - Local overrides
- `*.key` - Key files
- `*.pem` - Certificate files
- `node_modules/` - Dependencies

### Checking Git Status

Before committing, always check:

```bash
git status
```

Verify no sensitive files are staged.

### Untracking Committed Secrets

If you accidentally commit a secret:

1. Remove it from the file
2. Remove from git history:

```bash
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch .env" \
  --prune-empty --tag-name-filter cat -- --all
```

3. Force push (use with caution):

```bash
git push origin --force --all
```

4. Rotate the exposed credentials immediately

## Security Check Tool

### Running the Security Check

Run the security check manually:

```bash
npm run security-check
```

This will scan for:
- Hardcoded private keys
- Exposed API keys
- Environment files not in .gitignore
- Sensitive files staged for commit
- AWS keys
- JWT tokens
- Supabase URLs in source code

### What It Checks

1. **Environment Files**: Verifies `.env` exists and is in `.gitignore`
2. **Hardcoded Secrets**: Scans source files for hardcoded credentials
3. **Git Status**: Checks for sensitive files about to be committed
4. **Environment Variable Usage**: Validates proper usage patterns

### Security Check Output

- **Green (✓)**: Check passed
- **Yellow (⚠)**: Warning - review recommended
- **Red (✗)**: Critical issue - must fix before pushing

## Pre-Push Hooks

### Installation

Install git hooks to automatically run security checks:

```bash
./scripts/install-git-hooks.sh
```

Or manually:

```bash
npm install
```

### What the Hook Does

Before every push, the hook will:
1. Run the security check
2. Block the push if critical issues are found
3. Allow the push if checks pass

### Bypassing the Hook

Only in emergencies, you can bypass with:

```bash
git push --no-verify
```

**Warning**: Only use this if you're absolutely certain no secrets are exposed.

## Common Mistakes to Avoid

### 1. Committing .env Files

Never commit `.env` files. Always check `.gitignore` includes:

```
.env
.env.local
.env.*.local
```

### 2. Hardcoding API Keys

Bad:

```typescript
const apiKey = "sk_live_xxxxxxxxxxxxx";
```

Good:

```typescript
const apiKey = import.meta.env.VITE_API_KEY;
```

### 3. Logging Sensitive Data

Never log:
- Private keys
- API keys
- User passwords
- Authentication tokens

Bad:

```typescript
console.log("Private key:", privateKey);
```

Good:

```typescript
console.log("Wallet connected:", address);
```

### 4. Sharing Credentials in Code Comments

Bad:

```typescript
// Use API key: sk_test_xxxxxxxxxxxxx
const config = {...}
```

### 5. Using Production Keys in Development

Always use separate keys for:
- Development/testing
- Staging
- Production

### 6. Exposing Keys in Client-Side Code

Remember:
- **Public keys** (like Supabase anon key) can be in client code
- **Secret keys** must ONLY be in server-side code or edge functions
- Never put service role keys or private keys in frontend code

## Row Level Security (RLS)

Even though the Supabase anon key is public, your data is protected by:

1. **RLS Policies**: Define who can access what data
2. **Authentication**: Users must be logged in
3. **Authorization**: Policies check user permissions

### Verifying RLS

Check that all tables have RLS enabled:

```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';
```

All tables should have `rowsecurity = true`.

## Incident Response

If a secret is exposed:

1. **Immediately rotate** the exposed credential
2. **Review access logs** for unauthorized access
3. **Audit the codebase** for other potential exposures
4. **Update `.gitignore`** if needed
5. **Run security check**: `npm run security-check`
6. **Clean git history** if the secret was committed

## Regular Security Audits

Run these checks regularly:

```bash
npm run security-check
npm audit
npm run lint
```

## Questions?

For security concerns, contact the security team immediately.

Never discuss security vulnerabilities in public channels.
