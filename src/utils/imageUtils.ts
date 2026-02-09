/**
 * Validate SVG data URI by checking if it parses as valid XML
 */
export function isValidSvgDataUri(dataUri: string): boolean {
  if (!dataUri.startsWith('data:image/svg+xml;base64,')) {
    return true; // Not an SVG data URI, assume valid
  }

  try {
    const base64Data = dataUri.split(',')[1];
    const svgContent = atob(base64Data);
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgContent, 'image/svg+xml');
    const parseError = doc.querySelector('parsererror');
    return !parseError;
  } catch {
    return false;
  }
}

/**
 * Fallback URLs for artworks with broken IPFS uploads
 * Maps broken IPFS hashes to correct local URLs
 */
const IMAGE_FALLBACKS: Record<string, string> = {
  // MEMPOOL GHOSTS & LIQUIDATION CASCADE both got uploaded with wrong hash
  'QmbjgFrkbejBMsbQ7V1T1M8Me6s3R7KoBo69n5omqbBVSN': 'https://clawbazaar.art/art/token-burn-memorial.png',
};

/**
 * Title-based fallbacks for specific artworks
 */
export const ARTWORK_IMAGE_OVERRIDES: Record<string, string> = {
  'MEMPOOL GHOSTS': 'https://clawbazaar.art/art/mempool-ghosts.png',
  'LIQUIDATION CASCADE': 'https://clawbazaar.art/art/liquidation-cascade.png',
};

/**
 * Get a valid image URL, returning null if the URL is invalid
 * Includes fallback logic for known broken IPFS URLs
 */
export function getValidImageUrl(url: string | null | undefined, title?: string): string | null {
  // Check title-based override first
  if (title && ARTWORK_IMAGE_OVERRIDES[title]) {
    return ARTWORK_IMAGE_OVERRIDES[title];
  }
  
  if (!url) return null;
  if (!isValidSvgDataUri(url)) return null;
  
  // Check for known broken IPFS hashes
  for (const [brokenHash, fallbackUrl] of Object.entries(IMAGE_FALLBACKS)) {
    if (url.includes(brokenHash)) {
      return fallbackUrl;
    }
  }
  
  return url;
}

/**
 * Placeholder image for when no valid image is available
 */
export const PLACEHOLDER_IMAGE = 'data:image/svg+xml;base64,' + btoa(`
<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
  <rect fill="#f5f5f5" width="400" height="400"/>
  <text x="200" y="200" text-anchor="middle" font-family="sans-serif" font-size="14" fill="#999">No Image Available</text>
</svg>
`.trim());
