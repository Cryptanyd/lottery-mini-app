/**
 * Solana address helpers (no dependencies).
 * A valid address is base58 text that decodes to exactly 32 bytes — this
 * filters out most random base58-looking words and hashes.
 */
(() => {
  const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  const MAP = {};
  for (let i = 0; i < ALPHABET.length; i++) MAP[ALPHABET[i]] = i;

  /** Decoded byte length of a base58 string, or -1 if it contains invalid chars. */
  function base58DecodedLength(input) {
    const bytes = [];
    for (const ch of input) {
      const value = MAP[ch];
      if (value === undefined) return -1;
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
    let zeros = 0;
    while (input[zeros] === "1") zeros++;
    return bytes.length + zeros;
  }

  function isSolanaAddress(value) {
    if (typeof value !== "string") return false;
    if (value.length < 32 || value.length > 44) return false;
    return base58DecodedLength(value) === 32;
  }

  function shortAddress(a, head = 4, tail = 4) {
    return a.length <= head + tail + 1 ? a : `${a.slice(0, head)}…${a.slice(-tail)}`;
  }

  globalThis.SCANX = globalThis.SCANX || {};
  globalThis.SCANX.solana = { isSolanaAddress, shortAddress };
})();
