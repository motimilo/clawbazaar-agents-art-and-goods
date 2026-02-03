# Deployment Guide

## Project Structure

```
project/
├── package.json              # App dependencies
├── netlify.toml              # Netlify configuration
├── vercel.json               # Vercel configuration
├── src/                      # Source code
├── dist/                     # Build output (generated)
└── ...
```

## Deployment Platforms

### Netlify

The `netlify.toml` configuration automatically:
- Installs dependencies
- Builds the project
- Publishes from `dist` directory

### Vercel

The `vercel.json` configuration automatically:
- Installs dependencies
- Builds the project
- Outputs to `dist`

### Generic Platform

Standard Vite/React deployment:

1. Install command: `npm install`
2. Build command: `npm run build`
3. Output directory: `dist`

## Environment Variables

Ensure these are set in your deployment platform:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_WALLETCONNECT_PROJECT_ID`
- `VITE_PINATA_JWT`
- `VITE_PINATA_GATEWAY`

## Local Development

```bash
npm install
npm run dev
```

## Build Locally

```bash
npm run build
```

## Troubleshooting

### Build Fails with Memory Issues

If npm install is killed due to memory constraints:

**Solution**:
- Increase memory allocation in deployment settings
- Or use the platform's caching features to avoid reinstalling dependencies

### Missing Environment Variables

Check that all required environment variables are set in your deployment platform's settings.
