/**
 * ScanX popup: status on the current tab, quick scan, settings, recent scans.
 */
(() => {
  "use strict";

  const { config, solana } = globalThis.SCANX;
  const $ = (id) => document.getElementById(id);

  $("version").textContent = `v${config.VERSION}`;
  $("site-link").href = `${config.BASE_URL}/?ref=ext-popup`;
  $("pro-link").href = `${config.BASE_URL}/pricing?ref=ext-popup`;

  /* ---------------------------- Status ---------------------------- */

  function setStatus(state, title, sub) {
    $("status").dataset.state = state;
    $("status-title").textContent = title;
    $("status-sub").textContent = sub;
  }

  async function refreshStatus() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return setStatus("idle", "Not on X", "Open x.com to see scan buttons.");

    // Ask the content script directly — no "tabs" permission needed.
    chrome.tabs.sendMessage(tab.id, { type: "scanx:ping" }, (res) => {
      if (chrome.runtime.lastError || !res?.ok) {
        setStatus("idle", "Not on X", "Open x.com to see scan buttons. Already there? Reload the tab.");
        return;
      }
      if (!res.enabled) return setStatus("paused", "Paused on X", "Scan buttons are turned off below.");
      const n = res.found;
      setStatus("active", "Active on X", n ? `${n} contract address${n === 1 ? "" : "es"} found on this page` : "Watching tweets for contract addresses");
    });
  }

  /* --------------------------- Quick scan -------------------------- */

  $("quick").addEventListener("submit", async (e) => {
    e.preventDefault();
    const raw = $("ca").value.trim();
    const candidate = solana.isSolanaAddress(raw)
      ? raw
      : (raw.match(/[1-9A-HJ-NP-Za-km-z]{32,44}/g) || []).find(solana.isSolanaAddress);
    $("ca-err").hidden = !!candidate;
    if (!candidate) return;
    await chrome.runtime.sendMessage({ type: "scanx:open", address: candidate, pageUrl: null });
    window.close();
  });

  /* ---------------------------- Settings --------------------------- */

  async function initSettings() {
    const s = await chrome.storage.sync.get(config.DEFAULT_SETTINGS);
    document.querySelectorAll("[data-setting]").forEach((input) => {
      const key = input.dataset.setting;
      input.checked = !!s[key];
      input.addEventListener("change", async () => {
        await chrome.storage.sync.set({ [key]: input.checked });
        if (key === "enabled") setTimeout(refreshStatus, 300);
        if (key === "keepHistory" && !input.checked) {
          await chrome.storage.local.set({ history: [] });
          renderRecent();
        }
      });
    });
  }

  /* ----------------------------- Recent ---------------------------- */

  function ago(ms) {
    const m = Math.floor((Date.now() - ms) / 60000);
    if (m < 1) return "now";
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    return h < 24 ? `${h}h` : `${Math.floor(h / 24)}d`;
  }

  async function renderRecent() {
    const { history = [] } = await chrome.storage.local.get("history");
    const list = $("recent");
    list.innerHTML = "";
    $("recent-block").hidden = history.length === 0;
    for (const h of history.slice(0, 5)) {
      const li = document.createElement("li");
      const a = document.createElement("a");
      a.href = config.analyzeUrl(h.address);
      a.target = "_blank";
      a.rel = "noreferrer";
      const addr = document.createElement("span");
      addr.textContent = solana.shortAddress(h.address, 6, 6);
      const when = document.createElement("span");
      when.textContent = ago(h.at);
      a.append(addr, when);
      li.append(a);
      list.append(li);
    }
  }

  $("clear-history").addEventListener("click", async () => {
    await chrome.storage.local.set({ history: [] });
    renderRecent();
  });

  refreshStatus();
  initSettings();
  renderRecent();
})();
