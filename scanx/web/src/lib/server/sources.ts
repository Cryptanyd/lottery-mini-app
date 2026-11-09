/**
 * Free, key-less public data sources.
 *  - DexScreener: pairs, price, liquidity, socials, pair creation time
 *  - Jupiter (lite-api): token list metadata, holder count, prices
 * Each function is defensive: upstream schemas change, so every field is optional.
 */
import { fetchJson } from "./http";

/* ----------------------------- DexScreener ----------------------------- */

export interface DexPair {
  chainId: string;
  dexId: string;
  url: string;
  pairAddress: string;
  baseToken: { address: string; name: string; symbol: string };
  quoteToken: { address: string; name: string; symbol: string };
  priceUsd?: string;
  volume?: { h24?: number };
  priceChange?: { h24?: number };
  liquidity?: { usd?: number };
  fdv?: number;
  marketCap?: number;
  pairCreatedAt?: number;
  info?: {
    imageUrl?: string;
    websites?: { label?: string; url: string }[];
    socials?: { type: string; url: string }[];
  };
}

/** Up to 30 comma-separated addresses per call. */
export async function dexTokenPairs(addresses: string[]): Promise<DexPair[]> {
  if (!addresses.length) return [];
  const data = await fetchJson<DexPair[] | { pairs?: DexPair[] }>(
    `https://api.dexscreener.com/tokens/v1/solana/${addresses.slice(0, 30).join(",")}`,
  );
  const pairs = Array.isArray(data) ? data : (data.pairs ?? []);
  return pairs.filter((p) => p.chainId === "solana");
}

/* ------------------------------- Jupiter ------------------------------- */

export interface JupToken {
  id: string;
  name?: string;
  symbol?: string;
  icon?: string;
  decimals?: number;
  twitter?: string;
  telegram?: string;
  website?: string;
  tokenProgram?: string;
  holderCount?: number;
  isVerified?: boolean;
  usdPrice?: number;
  mcap?: number;
  fdv?: number;
  liquidity?: number;
  firstPool?: { id?: string; createdAt?: string };
  stats24h?: { priceChange?: number; buyVolume?: number; sellVolume?: number };
}

/** Search accepts a mint or comma-separated mints (up to 100). */
export async function jupTokens(mints: string[]): Promise<JupToken[]> {
  if (!mints.length) return [];
  const data = await fetchJson<JupToken[]>(
    `https://lite-api.jup.ag/tokens/v2/search?query=${mints.slice(0, 100).join(",")}`,
  );
  return Array.isArray(data) ? data : [];
}

export async function jupPrices(mints: string[]): Promise<Record<string, number>> {
  if (!mints.length) return {};
  const out: Record<string, number> = {};
  // Price v3 accepts up to 50 ids per call.
  for (let i = 0; i < mints.length; i += 50) {
    const chunk = mints.slice(i, i + 50);
    const data = await fetchJson<Record<string, { usdPrice?: number } | null>>(
      `https://lite-api.jup.ag/price/v3?ids=${chunk.join(",")}`,
    );
    for (const [mint, v] of Object.entries(data ?? {})) {
      if (v && typeof v.usdPrice === "number") out[mint] = v.usdPrice;
    }
  }
  return out;
}
