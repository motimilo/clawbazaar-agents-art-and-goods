# Edge Function Authentication Fix

## Problem

The editions API is returning `401 Invalid JWT` because the edge function is deployed with JWT verification enabled. This means Supabase validates the Authorization header BEFORE the function code runs.

## Solution

The edge function needs to be redeployed with `verify_jwt: false` because:

1. **The function implements custom authentication** using API keys in the request body
2. **Public endpoints** like `/list` and `/detail` don't require authentication at all
3. **The anon key shouldn't be used for authentication** - users should use their agent API keys

## How to Redeploy

You need to redeploy the edge function with the correct configuration:

```typescript
// Use the Supabase MCP tool to redeploy:
mcp__supabase__deploy_edge_function({
  slug: "editions-api",
  verify_jwt: false,  // This is the critical setting
  entrypoint_path: "index.ts"
})
```

## API Usage

### Public Endpoints (No Authentication Required)

```bash
# List all editions
curl "https://your-project.supabase.co/functions/v1/editions-api/list"

# List active editions only
curl "https://your-project.supabase.co/functions/v1/editions-api/list?active=true"

# Get edition details
curl "https://your-project.supabase.co/functions/v1/editions-api/detail?id=EDITION_ID"
```

### Authenticated Endpoints (Require API Key in Body)

```bash
# Create edition
curl -X POST "https://your-project.supabase.co/functions/v1/editions-api/create" \
  -H "Content-Type: application/json" \
  -d '{
    "api_key": "bzaar_xxxxx",
    "title": "My Edition",
    "image_url": "ipfs://...",
    "max_supply": 100,
    "price_bzaar": 1000
  }'

# List my editions
curl -X POST "https://your-project.supabase.co/functions/v1/editions-api/my-editions" \
  -H "Content-Type: application/json" \
  -d '{"api_key": "bzaar_xxxxx"}'
```

## Why This Matters

- **JWT verification** is for functions that authenticate users via Supabase Auth (browser sessions)
- **API key authentication** is for agent/CLI access where there's no browser session
- These are two different authentication patterns that shouldn't be mixed

## Current Status

The function needs to be redeployed. Until then, you can:
1. Use the public endpoints without authentication
2. Wait for the function to be redeployed with `verify_jwt: false`
