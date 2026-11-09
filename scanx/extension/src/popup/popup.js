/**
 * ScanX popup: status on the current tab, quick scan, settings, recent scans.
 */
(() => {
  "use strict";

  const { config, solana } = globalThis.SCANX;
  const $ = (id) => document.getElementById(id);

  $("version").textContent = `v${config.VERSION}`;
  /** Latest settings (kept in sync with chrome.storage). */
  let current = { ...config.DEFAULT_SETTINGS };

  /** Footer links + hint reflect whether a ScanX site is configured. */
  function renderSiteState() {
    const site = config.siteUrl(current);
    const target = config.target(current);
    for (const [id, path] of [["site-link", "/"], ["pro-link", "/pricing"]]) {
      const a = $(id);
      a.hidden = !site;
      if (site) a.href = `${site}${path}?ref=ext-popup`;
    }
    const hint = $("site-hint");
    hint.className = "hint";
    if (current.openWith === "scanx" && !site) {
      hint.textContent = "No ScanX site yet — opening on DexScreener. Paste your site URL above.";
    } else if (site) {
      hint.textContent = target === "scanx" ? `Reports open on ${new URL(site).host}` : `Site saved: ${new URL(site).host}`;
      hint.classList.add("ok");
    } else {
      hint.textContent = "";
    }
  }

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
    current = { ...current, ...s };

    // "Open reports in" selector
    const sel = $("open-with");
    for (const [key, t] of Object.entries(config.TARGETS)) {
      const o = document.createElement("option");
      o.value = key;
      o.textContent = t.label;
      sel.append(o);
    }
    sel.value = current.openWith in config.TARGETS ? current.openWith : "scanx";
    sel.addEventListener("change", async () => {
      current.openWith = sel.value;
      await chrome.storage.sync.set({ openWith: sel.value });
      renderSiteState();
      renderRecent();
    });

    // Click action
    const clickSel = $("click-action");
    clickSel.value = current.clickAction === "tab" ? "tab" : "card";
    clickSel.addEventListener("change", async () => {
      current.clickAction = clickSel.value;
      await chrome.storage.sync.set({ clickAction: clickSel.value });
    });

    // Optional Helius RPC
    const rpcInput = $("rpc-url");
    rpcInput.value = current.rpcUrl || "";
    const saveRpc = async () => {
      const v = rpcInput.value.trim();
      const hint = $("rpc-hint");
      if (v && !/^https:\/\/(mainnet\.helius-rpc\.com\/|api\.mainnet-beta\.solana\.com)/.test(v)) {
        hint.textContent = "Only Helius (mainnet.helius-rpc.com) or the public Solana RPC are supported";
        hint.className = "hint bad";
        return;
      }
      current.rpcUrl = v;
      await chrome.storage.sync.set({ rpcUrl: v });
      hint.textContent = v ? "RPC saved" : "Using the public Solana RPC";
      hint.className = v ? "hint ok" : "hint";
    };
    $("rpc-save").addEventListener("click", saveRpc);
    rpcInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") saveRpc();
    });

    // ScanX site URL
    const siteInput = $("site-url");
    siteInput.value = current.siteUrl || "";
    const saveSite = async () => {
      const raw = siteInput.value.trim();
      const normalized = config.normalizeSiteUrl(raw);
      if (raw && normalized === null) {
        const hint = $("site-hint");
        hint.textContent = "Enter a valid https:// address, e.g. https://scanx-xxx.vercel.app";
        hint.className = "hint bad";
        return;
      }
      current.siteUrl = normalized || "";
      siteInput.value = current.siteUrl;
      if (current.siteUrl) {
        current.openWith = "scanx";
        sel.value = "scanx";
      }
      await chrome.storage.sync.set({ siteUrl: current.siteUrl, openWith: current.openWith });
      renderSiteState();
      renderRecent();
    };
    $("site-save").addEventListener("click", saveSite);
    siteInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") saveSite();
    });
    renderSiteState();

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
      a.href = config.analyzeUrl(h.address, current);
      a.target = "_blank";
      a.rel = "noreferrer";
      const addr = document.createElement("span");
      addr.textContent = h.symbol ? `$${h.symbol}` : solana.shortAddress(h.address, 6, 6);
      const right = document.createElement("span");
      if (typeof h.score === "number") {
        const sc = document.createElement("span");
        sc.className = `sc ${h.level || ""}`;
        sc.textContent = `${h.score} · `;
        right.append(sc);
      }
      right.append(ago(h.at));
      a.append(addr, right);
      li.append(a);
      list.append(li);
    }
  }

  $("clear-history").addEventListener("click", async () => {
    await chrome.storage.local.set({ history: [] });
    renderRecent();
  });

  refreshStatus();
  initSettings().then(renderRecent);
})();
