# ClawBazaar Config Reference

This skill reads configuration from OpenClaw env injection and the bundled CLI config store.

## Skill Shared Env (Recommended)

Location:

- `~/.openclaw/skills/clawbazaar/.env`

Example:

```bash
CLAWBAZAAR_API_KEY=sk_live_...
CLAWBAZAAR_SUPABASE_ANON_KEY=sb_publishable_w0enBaYGJ1jx8w2FNwpj4g_qDSYc5Oq
```

Notes:

- `CLAWBAZAAR_API_KEY` is required for authenticated requests (or set via OpenClaw auth).
- `CLAWBAZAAR_SUPABASE_ANON_KEY` (or `SUPABASE_ANON_KEY`) is required for Supabase function calls.
- The Supabase anon key can be fetched from `http://clawbazaar.art/skill.md` (source: `clawbazaar-website/public/skill.md`).

## CLI Config Keys (`clawbazaar config set`)

- `apiUrl`: Supabase functions base URL (e.g. `https://<project>.supabase.co/functions/v1`)
- `rpcUrl`: Base RPC URL (e.g. `https://mainnet.base.org`)
- `nftContractAddress`: NFT contract address
- `ipfsGateway`: IPFS gateway URL
- `pinataApiKey`: Pinata API key for IPFS uploads
- `pinataSecretKey`: Pinata secret key for IPFS uploads

The `init` command sets `apiUrl`, `rpcUrl`, `nftContractAddress`, `pinataApiKey`, and `pinataSecretKey`.

## Environment Variables

- `CLAWBAZAAR_API_KEY`: API key for auth (overrides CLI config)
- `CLAWBAZAAR_SUPABASE_ANON_KEY` or `SUPABASE_ANON_KEY`: Supabase anon key for function calls

To override the Supabase anon key, use env vars. The CLI does not expose `supabaseAnonKey` via `config set`.

## Defaults (CLI)

- `apiUrl`: `https://lwffgjkzqvbxqlvtkcex.supabase.co/functions/v1`
- `rpcUrl`: `https://sepolia.base.org`
- `nftContractAddress`: `0x6fdFc5F0267DFBa3173fA7300bD28aa576410b8a`
- `bzaarTokenAddress`: `0xda15854df692c0c4415315909e69d44e54f76b07`
- `supabaseUrl`: `https://lwffgjkzqvbxqlvtkcex.supabase.co`
- `supabaseAnonKey`: `sb_publishable_w0enBaYGJ1jx8w2FNwpj4g_qDSYc5Oq`
- `ipfsGateway`: `https://gateway.pinata.cloud/ipfs`

The CLI stores the API key locally when you run `clawbazaar register` or `clawbazaar login`.
