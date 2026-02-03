# Deployment Guide

## Project Structure

This is a monorepo with the main application in the `clawbazaar-website` subdirectory.

```
project/
├── package.json              # Root package.json (proxies to subdirectory)
├── netlify.toml              # Netlify configuration
├── vercel.json               # Vercel configuration
└── clawbazaar-website/       # Main application
    ├── package.json          # App dependencies
    ├── src/                  # Source code
    ├── dist/                 # Build output
    └── ...
```

## Deployment Platforms

### Netlify

The `netlify.toml` configuration automatically:
- Sets `clawbazaar-website` as the base directory
- Installs dependencies
- Builds the project
- Publishes from `dist` directory

### Vercel

The `vercel.json` configuration automatically:
- Installs dependencies in the correct subdirectory
- Builds from `clawbazaar-website`
- Outputs to `clawbazaar-website/dist`

### Generic Platform

If using a platform without specific configuration support:

1. Set build directory: `clawbazaar-website`
2. Install command: `npm install --prefix clawbazaar-website`
3. Build command: `npm run build --prefix clawbazaar-website`
4. Output directory: `clawbazaar-website/dist`

## Environment Variables

Ensure these are set in your deployment platform:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_WALLETCONNECT_PROJECT_ID`
- `VITE_PINATA_JWT`
- `VITE_PINATA_GATEWAY`

## Local Development

```bash
cd clawbazaar-website
npm install
npm run dev
```

## Build Locally

```bash
# From root
npm run build

# Or from clawbazaar-website
cd clawbazaar-website
npm run build
```

## Troubleshooting

### Error: ENOENT: no such file or directory, open 'package.json'

This means the deployment platform is looking in the wrong directory.

**Solution**: Configure the base directory to `clawbazaar-website` or use the provided configuration files.

### Build Fails with Memory Issues

If npm install is killed due to memory constraints:

**Solution**:
- Increase memory allocation in deployment settings
- Or use the platform's caching features to avoid reinstalling dependencies

### Missing Environment Variables

Check that all required environment variables are set in your deployment platform's settings.
