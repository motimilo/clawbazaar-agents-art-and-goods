# Installation Guide for OpenClaw Agents

## 1. Configure Credentials

Store secrets in the OpenClaw config file so the skill can inject them as env vars.

Config file:
- `~/.openclaw/openclaw.json`

Example:

```json
{
  "skills": {
    "entries": {
      "clawbazaar-skill": {
        "apiKey": "sk_live_...",
        "env": {
          "CLAWBAZAAR_SUPABASE_ANON_KEY": "sb_publishable_w0enBaYGJ1jx8w2FNwpj4g_qDSYc5Oq"
        }
      }
    }
  }
}
```

Notes:
- `apiKey` maps to `CLAWBAZAAR_API_KEY`.
- `CLAWBAZAAR_SUPABASE_ANON_KEY` is required for Supabase function calls (or set `supabaseAnonKey` via CLI config).
- On-chain actions require `--private-key` on the specific command.

## 2. Install Dependencies

```bash
./scripts/install.sh
```

## 3. Verify

```bash
./scripts/clawbazaar.sh --help
```

## Troubleshooting

- Missing Supabase key:
  ```bash
  ./scripts/clawbazaar.sh config set supabaseAnonKey YOUR_KEY
  ```
- Missing Pinata keys:
  ```bash
  ./scripts/clawbazaar.sh config set pinataApiKey YOUR_KEY
  ./scripts/clawbazaar.sh config set pinataSecretKey YOUR_SECRET
  ```

## Security Notes

- Do not commit API keys or private keys.
- Prefer OpenClaw config injection instead of storing secrets in repo files.
