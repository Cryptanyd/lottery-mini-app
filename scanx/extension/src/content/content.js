/**
 * ScanX content script for x.com / twitter.com
 *
 * Responsibilities
 *  1. Find Solana CAs in tweets, replies, quotes (and optionally bios).
 *  2. Put a small "scan" button right after the text that contains the CA.
 *  3. Keep up with X's infinite scroll / re-renders via MutationObserver.
 *
 * Design notes
 *  - We never split or rewrite X's text nodes (X is a React app; mutating its
 *    text nodes breaks reconciliation). Buttons are inserted as *siblings*
 *    after the element that holds the CA, and the insert is idempotent, so if
 *    React re-renders and drops a button we simply add it back.
 *  - All UI is namespaced with `scanx-` classes to avoid style collisions.
 *
 * Extension points (next versions)
 *  - Quick-analysis hover card: replace `showTooltip` with a card that calls
 *    `${BASE_URL}/api/analyze?ca=…` (the API already sends CORS headers).
 *  - CA highlighting: wrap matches visually via CSS Highlight API (no DOM edits).
 */
(() => {
  "use strict";

  const { config, detector, solana } = globalThis.SCANX;

  /** Where CAs can appear. */
  const TWEET_SELECTORS = ['[data-testid="tweetText"]', '[data-testid="card.wrapper"]'];
  const PROFILE_SELECTORS = ['[data-testid="UserDescription"]'];

  const BTN_CLASS = "scanx-btn";
  const SCAN_DELAY_MS = 200;

  let settings = { ...config.DEFAULT_SETTINGS };
  /** Last text seen per container, to skip unchanged containers on rescan. */
  let lastText = new WeakMap();
  let scheduled = null;

  /* ------------------------------------------------------------------ */
  /*  Settings                                                           */
  /* ------------------------------------------------------------------ */

  function loadSettings() {
    return new Promise((resolve) => {
      try {
        chrome.storage.sync.get(config.DEFAULT_SETTINGS, (s) => resolve({ ...config.DEFAULT_SETTINGS, ...s }));
      } catch {
        resolve({ ...config.DEFAULT_SETTINGS });
      }
    });
  }

  /* ------------------------------------------------------------------ */
  /*  Theme: follow X's Default / Dim / Lights-out background            */
  /* ------------------------------------------------------------------ */

  function syncTheme() {
    const bg = getComputedStyle(document.body).backgroundColor;
    const m = bg.match(/\d+(\.\d+)?/g);
    let theme = "dark";
    if (m && m.length >= 3) {
      const [r, g, b] = m.map(Number);
      const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
      theme = luminance > 0.5 ? "light" : "dark";
    }
    if (document.documentElement.dataset.scanxTheme !== theme) {
      document.documentElement.dataset.scanxTheme = theme;
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Button                                                             */
  /* ------------------------------------------------------------------ */

  const ICON_SVG =
    '<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">' +
    '<circle cx="8" cy="8" r="4.6" fill="none" stroke="currentColor" stroke-width="1.6"/>' +
    '<path d="M8 1.2v2.6M8 12.2v2.6M1.2 8h2.6M12.2 8h2.6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>' +
    '<circle cx="8" cy="8" r="1.7" class="scanx-core"/>' +
    "</svg>";

  function createButton(address) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = BTN_CLASS;
    btn.dataset.scanxAddr = address;
    btn.setAttribute("aria-label", `Analyze ${address} on ScanX`);
    btn.innerHTML = ICON_SVG;

    // X navigates to the tweet on click/pointer events bubbling to <article>.
    // Swallow them all so only our action runs.
    for (const type of ["pointerdown", "mousedown", "mouseup", "pointerup", "touchstart"]) {
      btn.addEventListener(type, stop, { passive: false });
    }
    btn.addEventListener("click", (e) => {
      stop(e);
      openReport(address);
    });
    btn.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        stop(e);
        openReport(address);
      }
    });
    btn.addEventListener("mouseenter", () => showTooltip(btn, address));
    btn.addEventListener("focus", () => showTooltip(btn, address));
    btn.addEventListener("mouseleave", hideTooltip);
    btn.addEventListener("blur", hideTooltip);
    return btn;
  }

  function stop(e) {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
  }

  function openReport(address) {
    hideTooltip();
    const payload = { type: "scanx:open", address, pageUrl: location.href };
    try {
      // Background opens the tab (respects "open in background" setting + logs history).
      chrome.runtime.sendMessage(payload, () => {
        if (chrome.runtime.lastError) window.open(config.analyzeUrl(address), "_blank", "noopener");
      });
    } catch {
      // Extension was reloaded/updated while this tab stayed open.
      window.open(config.analyzeUrl(address), "_blank", "noopener");
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Tooltip (one shared element, fixed-positioned so tweets can't clip) */
  /* ------------------------------------------------------------------ */

  let tooltip = null;

  function showTooltip(anchor, address) {
    if (!tooltip) {
      tooltip = document.createElement("div");
      tooltip.className = "scanx-tooltip";
      tooltip.setAttribute("role", "tooltip");
      document.body.appendChild(tooltip);
    }
    tooltip.innerHTML = "";
    const title = document.createElement("div");
    title.className = "scanx-tooltip-title";
    title.textContent = "Analyze on ScanX";
    const sub = document.createElement("div");
    sub.className = "scanx-tooltip-sub";
    sub.textContent = solana.shortAddress(address, 6, 6);
    tooltip.append(title, sub);

    const r = anchor.getBoundingClientRect();
    tooltip.style.visibility = "hidden";
    tooltip.classList.add("scanx-visible");
    const tw = tooltip.offsetWidth;
    const th = tooltip.offsetHeight;
    let top = r.top - th - 8;
    if (top < 8) top = r.bottom + 8; // flip below when near the top edge
    const left = Math.min(Math.max(8, r.left + r.width / 2 - tw / 2), window.innerWidth - tw - 8);
    tooltip.style.top = `${top}px`;
    tooltip.style.left = `${left}px`;
    tooltip.style.visibility = "";
  }

  function hideTooltip() {
    tooltip?.classList.remove("scanx-visible");
  }

  /* ------------------------------------------------------------------ */
  /*  Scanning                                                           */
  /* ------------------------------------------------------------------ */

  function containerSelector() {
    return [...TWEET_SELECTORS, ...(settings.scanProfiles ? PROFILE_SELECTORS : [])].join(",");
  }

  /**
   * The element after which buttons are inserted for a given text node:
   *  - links (CA inside a dexscreener/pump.fun URL) → after the <a>
   *  - text inside a span → after that span
   *  - text directly in the container → after the text node itself
   */
  function hostFor(textNode, container) {
    const parent = textNode.parentElement;
    if (!parent) return null;
    const link = parent.closest("a");
    if (link && container.contains(link)) return link;
    if (parent !== container) return parent;
    return textNode;
  }

  /** Buttons already sitting directly after `host`. */
  function existingButtons(host) {
    const found = new Set();
    let n = host.nextSibling;
    while (n && n.nodeType === 1 && n.classList.contains(BTN_CLASS)) {
      found.add(n.dataset.scanxAddr);
      n = n.nextSibling;
    }
    return { found, insertBefore: n };
  }

  function scanContainer(container) {
    const text = container.textContent || "";
    if (lastText.get(container) === text && container.querySelector(`.${BTN_CLASS}`)) return;
    lastText.set(container, text);
    if (text.length < 32) return;

    // Cheap pre-check before walking the DOM.
    if (!detector.findAddresses(text).length) return;

    const hosts = new Set();
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, {
      acceptNode: (n) =>
        n.parentElement && !n.parentElement.closest(`.${BTN_CLASS}`) && (n.nodeValue || "").length >= 4
          ? NodeFilter.FILTER_ACCEPT
          : NodeFilter.FILTER_REJECT,
    });
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const host = hostFor(n, container);
      if (host) hosts.add(host);
    }

    for (const host of hosts) {
      const hostText = host.nodeType === 3 ? host.nodeValue : host.textContent;
      const matches = detector.findAddresses(hostText || "");
      if (!matches.length) continue;
      const { found, insertBefore } = existingButtons(host);
      for (const { address } of matches) {
        if (found.has(address)) continue;
        host.parentNode?.insertBefore(createButton(address), insertBefore);
      }
    }
  }

  function scanAll() {
    scheduled = null;
    if (!settings.enabled) return;
    syncTheme();
    document.querySelectorAll(containerSelector()).forEach(scanContainer);
  }

  function scheduleScan() {
    if (scheduled !== null) return;
    scheduled = setTimeout(() => {
      // Do the work when the browser is idle so scrolling stays smooth.
      if ("requestIdleCallback" in window) requestIdleCallback(scanAll, { timeout: 500 });
      else scanAll();
    }, SCAN_DELAY_MS);
  }

  function removeAllButtons() {
    document.querySelectorAll(`.${BTN_CLASS}`).forEach((b) => b.remove());
    lastText = new WeakMap();
    hideTooltip();
  }

  /** Unique CAs currently on the page (for the popup status). */
  function countFound() {
    const set = new Set();
    document.querySelectorAll(`.${BTN_CLASS}`).forEach((b) => set.add(b.dataset.scanxAddr));
    return set.size;
  }

  /* ------------------------------------------------------------------ */
  /*  Boot                                                               */
  /* ------------------------------------------------------------------ */

  async function init() {
    settings = await loadSettings();

    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        // Ignore our own button insertions. Removals are NOT ignored: if X's
        // re-render drops a button we want to rescan and put it back.
        if (m.type === "childList" && m.addedNodes.length && !m.removedNodes.length) {
          const onlyOurs = [...m.addedNodes].every((n) => n.nodeType === 1 && n.classList?.contains(BTN_CLASS));
          if (onlyOurs) continue;
        }
        scheduleScan();
        return;
      }
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });

    window.addEventListener("scroll", hideTooltip, { passive: true, capture: true });

    try {
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area !== "sync") return;
        for (const [k, v] of Object.entries(changes)) settings[k] = v.newValue;
        removeAllButtons();
        scanAll();
      });

      chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
        if (msg?.type === "scanx:ping") {
          sendResponse({ ok: true, enabled: settings.enabled, found: countFound(), host: location.host });
        }
      });
    } catch {
      /* context invalidated */
    }

    scanAll();
  }

  init();
})();
