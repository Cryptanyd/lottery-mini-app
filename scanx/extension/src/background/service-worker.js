/**
 * ScanX background service worker (MV3).
 *  - Runs quick token analysis for the in-page card (no ScanX server needed)
 *  - Opens report tabs (respects "open in background")
 *  - Keeps a local history of scanned CAs
 *  - Seeds default settings on install
 */
importScripts("../shared/config.js", "../shared/solana.js", "../shared/risk.js", "../shared/analyzer.js");

const { config, solana, analyzer } = self.SCANX;

/** RPC hosts the extension has host_permissions for. */
const ALLOWED_RPC_PREFIXES = ["https://api.mainnet-beta.solana.com", "https://mainnet.helius-rpc.com/"];

chrome.runtime.onInstalled.addListener(async ({ reason }) => {
  // Fill in any settings that don't exist yet, keep the user's existing ones.
  const current = await chrome.storage.sync.get(null);
  await chrome.storage.sync.set({ ...config.DEFAULT_SETTINGS, ...current });

  // Welcome page only when a ScanX site is baked into the build.
  const site = config.siteUrl({});
  if (reason === "install" && site) {
    chrome.tabs.create({ url: `${site}/?ref=ext-install` });
  }
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type === "scanx:open") {
    handleOpen(msg, sender)
      .then(() => sendResponse({ ok: true }))
      .catch((e) => sendResponse({ ok: false, error: String(e) }));
    return true; // async response
  }
  if (msg?.type === "scanx:analyze") {
    handleAnalyze(msg)
      .then((report) => sendResponse({ ok: true, report }))
      .catch((e) => sendResponse({ ok: false, error: e && e.message ? e.message : String(e) }));
    return true;
  }
  return false;
});

async function getSettings() {
  return chrome.storage.sync.get(config.DEFAULT_SETTINGS);
}

/* ------------------------------ analysis ------------------------------ */

const cache = new Map(); // address -> { at, report }
const CACHE_MS = 30_000;

async function handleAnalyze({ address, pageUrl }) {
  if (!solana.isSolanaAddress(address)) throw new Error("Invalid Solana address");
  const settings = await getSettings();

  const hit = cache.get(address);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.report;

  const custom = String(settings.rpcUrl || "").trim();
  const rpcUrl = ALLOWED_RPC_PREFIXES.some((p) => custom.startsWith(p)) ? custom : analyzer.DEFAULT_RPC;

  const report = await analyzer.analyzeToken(address, { fetch: (...a) => fetch(...a), rpcUrl });
  // Cache only real results — a failed/offline lookup should be retried right away.
  if (report.kind === "token" || report.kind === "wallet") {
    cache.set(address, { at: Date.now(), report });
    if (cache.size > 100) cache.delete(cache.keys().next().value);
  }

  if (settings.keepHistory) await addToHistory(address, pageUrl, report);
  return report;
}

/* -------------------------------- tabs -------------------------------- */

async function handleOpen({ address, target, pageUrl }, sender) {
  if (!solana.isSolanaAddress(address)) throw new Error("invalid address");
  const settings = await getSettings();

  await chrome.tabs.create({
    url: config.urlFor(target || "primary", address, settings),
    active: !settings.openInBackground,
    // Place the new tab right after the X tab it came from.
    ...(sender?.tab ? { index: sender.tab.index + 1, openerTabId: sender.tab.id } : {}),
  });

  if (settings.keepHistory) await addToHistory(address, pageUrl);
}

async function addToHistory(address, pageUrl, report) {
  const { history = [] } = await chrome.storage.local.get("history");
  const prev = history.find((h) => h.address === address);
  const entry = {
    address,
    at: Date.now(),
    from: pageUrl || prev?.from || null,
    symbol: report?.token?.symbol ?? prev?.symbol ?? null,
    score: report?.risk?.score ?? prev?.score ?? null,
    level: report?.risk?.level ?? prev?.level ?? null,
  };
  const next = [entry, ...history.filter((h) => h.address !== address)].slice(0, config.HISTORY_LIMIT);
  await chrome.storage.local.set({ history: next });
}
