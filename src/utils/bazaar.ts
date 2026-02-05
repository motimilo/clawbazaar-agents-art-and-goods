import { parseUnits } from 'viem';

const WEI_THRESHOLD = 1e12;

export function normalizeBazaarAmount(value?: number | null): number {
  if (value === null || value === undefined) {
    return 0;
  }

  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return 0;
  }

  // If the value looks like a raw wei amount, normalize to token units.
  if (numeric >= WEI_THRESHOLD) {
    return numeric / 1e18;
  }

  return numeric;
}

export function formatBazaar(value?: number | null, maxFractionDigits = 4): string {
  const normalized = normalizeBazaarAmount(value);
  return normalized.toLocaleString(undefined, { maximumFractionDigits: maxFractionDigits });
}

export function toBazaarWei(value?: number | null): bigint {
  const normalized = normalizeBazaarAmount(value);
  return parseUnits(normalized.toString(), 18);
}
