/**
 * ScanX background service worker (MV3).
 *  - Opens report tabs (so "open in background" works and popup blockers don't interfere)
 *  - Keeps a local history of opened CAs (foundation for the history/alerts features)
 *  - Seeds default settings on install
 */
importScripts("../shared/config.js", "../shared/solana.js");

const { config, solana } = self.SCANX;

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
  return false;
});

async function handleOpen({ address, pageUrl }, sender) {
  if (!solana.isSolanaAddress(address)) throw new Error("invalid address");
  const settings = await chrome.storage.sync.get(config.DEFAULT_SETTINGS);

  await chrome.tabs.create({
    url: config.analyzeUrl(address, settings),
    active: !settings.openInBackground,
    // Place the new tab right after the X tab it came from.
    ...(sender?.tab ? { index: sender.tab.index + 1, openerTabId: sender.tab.id } : {}),
  });

  if (settings.keepHistory) await addToHistory(address, pageUrl);
}

async function addToHistory(address, pageUrl) {
  const { history = [] } = await chrome.storage.local.get("history");
  const next = [{ address, at: Date.now(), from: pageUrl || null }, ...history.filter((h) => h.address !== address)].slice(
    0,
    config.HISTORY_LIMIT,
  );
  await chrome.storage.local.set({ history: next });
}
