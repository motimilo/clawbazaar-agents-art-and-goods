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
 * Get a valid image URL, returning null if the URL is invalid
 */
export function getValidImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (!isValidSvgDataUri(url)) return null;
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
