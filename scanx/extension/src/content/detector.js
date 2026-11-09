/**
 * Finds Solana contract addresses inside arbitrary text.
 * Pure function — easy to unit-test and reuse (e.g. for highlighting later).
 */
(() => {
  const B58 = "1-9A-HJ-NP-Za-km-z";
  // A base58 run of 32–44 chars that is not part of a longer base58 run.
  const ADDRESS_RE = new RegExp(`(?<![${B58}])[${B58}]{32,44}(?![${B58}])`, "g");

  // Well-known program / system addresses that are never "a CA someone shills".
  const IGNORE = new Set([
    "11111111111111111111111111111111",
    "So11111111111111111111111111111111111111112",
    "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
    "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb",
  ]);

  /**
   * @param {string} text
   * @returns {{ address: string, index: number }[]} unique addresses in order of appearance
   */
  function findAddresses(text) {
    if (!text || text.length < 32) return [];
    const out = [];
    const seen = new Set();
    for (const m of text.matchAll(ADDRESS_RE)) {
      const address = m[0];
      if (seen.has(address) || IGNORE.has(address)) continue;
      if (!globalThis.SCANX.solana.isSolanaAddress(address)) continue;
      seen.add(address);
      out.push({ address, index: m.index });
    }
    return out;
  }

  globalThis.SCANX.detector = { findAddresses };
})();
