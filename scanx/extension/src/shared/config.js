/**
 * ScanX extension — shared configuration.
 * Loaded by content scripts, the popup and the background service worker.
 *
 * ▶ SCANX_BASE_URL is the default ScanX site baked into the build
 *   (scripts/pack.sh https://your-domain sets it). Users can also enter
 *   their site URL in the popup — that value wins.
 *   Leave it empty ("") if the site isn't deployed yet: reports then open
 *   on DexScreener until a site URL is configured.
 */
const SCANX_BASE_URL = "";

globalThis.SCANX = globalThis.SCANX || {};

/** Where a CA can be opened. `scanx` = your ScanX site. */
const SCANX_TARGETS = Object.freeze({
  scanx: { label: "ScanX (your site)", url: null },
  dexscreener: { label: "DexScreener", url: (a) => `https://dexscreener.com/solana/${a}` },
  gmgn: { label: "GMGN", url: (a) => `https://gmgn.ai/sol/token/${a}` },
  birdeye: { label: "Birdeye", url: (a) => `https://birdeye.so/token/${a}?chain=solana` },
});

function normalizeSiteUrl(value) {
  const v = String(value || "").trim().replace(/\/+$/, "");
  if (!v) return "";
  const withProto = /^https?:\/\//i.test(v) ? v : `https://${v}`;
  try {
    const u = new URL(withProto);
    const local = u.hostname === "localhost" || u.hostname === "127.0.0.1";
    const validHost = /^(?=.{4,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i.test(u.hostname);
    if ((u.protocol === "https:" && validHost) || local) return u.origin;
  } catch {
    /* invalid */
  }
  return null; // invalid
}

globalThis.SCANX.config = Object.freeze({
  BASE_URL: SCANX_BASE_URL,
  NAME: "ScanX",
  VERSION: "0.3.0",
  TARGETS: SCANX_TARGETS,
  normalizeSiteUrl,

  /** The ScanX site in use: user setting > baked-in default > none. */
  siteUrl(settings) {
    return normalizeSiteUrl(settings?.siteUrl) || normalizeSiteUrl(SCANX_BASE_URL) || "";
  },

  /** Effective target: falls back to DexScreener while no ScanX site is configured. */
  target(settings) {
    const t = settings?.openWith in SCANX_TARGETS ? settings.openWith : "scanx";
    if (t === "scanx" && !this.siteUrl(settings)) return "dexscreener";
    return t;
  },

  /** Report URL for a contract address under the given settings. */
  analyzeUrl(address, settings) {
    const t = this.target(settings);
    if (t === "scanx") return `${this.siteUrl(settings)}/ca/${encodeURIComponent(address)}?ref=ext`;
    return SCANX_TARGETS[t].url(encodeURIComponent(address));
  },

  /** URL for any open-target used by the quick card. */
  urlFor(target, address, settings) {
    const a = encodeURIComponent(address);
    if (target === "primary" || !target) return this.analyzeUrl(address, settings);
    if (target === "solscan") return `https://solscan.io/token/${a}`;
    if (target === "wallet") return `https://gmgn.ai/sol/address/${a}`;
    if (target === "scanx" && this.siteUrl(settings)) return `${this.siteUrl(settings)}/ca/${a}?ref=ext`;
    if (SCANX_TARGETS[target] && SCANX_TARGETS[target].url) return SCANX_TARGETS[target].url(a);
    return this.analyzeUrl(address, settings);
  },

  /** Default user settings (stored in chrome.storage.sync). */
  DEFAULT_SETTINGS: Object.freeze({
    enabled: true, // show buttons next to CAs
    openInBackground: false, // open report tab without switching to it
    scanProfiles: true, // also scan user bios
    keepHistory: true, // remember last opened CAs (local only)
    openWith: "scanx", // scanx | dexscreener | gmgn | birdeye
    siteUrl: "", // user-provided ScanX site, e.g. https://scanx-xxx.vercel.app
    clickAction: "card", // card = quick analysis in X, tab = open report tab
    rpcUrl: "", // optional custom Solana RPC (e.g. Helius) for quick analysis
  }),

  HISTORY_LIMIT: 50,
});
