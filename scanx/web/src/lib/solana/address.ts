/**
 * Lightweight Solana address validation without pulling web3.js into the
 * client bundle: base58 alphabet + decoded length must be exactly 32 bytes.
 */
const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const MAP: Record<string, number> = Object.fromEntries([...ALPHABET].map((c, i) => [c, i]));

export const BASE58_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export function base58Decode(input: string): Uint8Array | null {
  if (!input) return null;
  const bytes: number[] = [];
  for (const ch of input) {
    const value = MAP[ch];
    if (value === undefined) return null;
    let carry = value;
    for (let i = 0; i < bytes.length; i++) {
      carry += bytes[i] * 58;
      bytes[i] = carry & 0xff;
      carry >>= 8;
    }
    while (carry > 0) {
      bytes.push(carry & 0xff);
      carry >>= 8;
    }
  }
  // Each leading '1' is a leading zero byte.
  for (const ch of input) {
    if (ch !== "1") break;
    bytes.push(0);
  }
  return Uint8Array.from(bytes.reverse());
}

export function isSolanaAddress(value: string | null | undefined): boolean {
  if (!value) return false;
  const v = value.trim();
  if (!BASE58_RE.test(v)) return false;
  return base58Decode(v)?.length === 32;
}

/** Extract an address from raw input: plain CA, or links like dexscreener/pump.fun/solscan. */
export function extractAddress(raw: string): string | null {
  const text = raw.trim();
  if (isSolanaAddress(text)) return text;
  const candidates = text.match(/[1-9A-HJ-NP-Za-km-z]{32,44}/g) ?? [];
  return candidates.find((c) => isSolanaAddress(c)) ?? null;
}

export function shortAddress(a: string, head = 4, tail = 4) {
  return a.length <= head + tail + 1 ? a : `${a.slice(0, head)}…${a.slice(-tail)}`;
}
