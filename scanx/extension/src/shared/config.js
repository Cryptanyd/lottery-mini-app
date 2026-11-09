/**
 * ScanX extension — shared configuration.
 * Loaded by content scripts, the popup and the background service worker.
 *
 * ▶ To point the extension at your own deployment, change SCANX_BASE_URL only.
 */
const SCANX_BASE_URL = "https://scanx.app";

globalThis.SCANX = globalThis.SCANX || {};

globalThis.SCANX.config = Object.freeze({
  BASE_URL: SCANX_BASE_URL,
  NAME: "ScanX",
  VERSION: "0.1.0",

  /** Build the report URL for a contract address. `ref=ext` lets the site attribute traffic. */
  analyzeUrl(address) {
    return `${SCANX_BASE_URL}/ca/${encodeURIComponent(address)}?ref=ext`;
  },

  /** Default user settings (stored in chrome.storage.sync). */
  DEFAULT_SETTINGS: Object.freeze({
    enabled: true, // show buttons next to CAs
    openInBackground: false, // open report tab without switching to it
    scanProfiles: true, // also scan user bios
    keepHistory: true, // remember last opened CAs (local only)
  }),

  HISTORY_LIMIT: 50,
});
