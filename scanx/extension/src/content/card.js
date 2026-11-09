/**
 * Quick-analysis card shown on x.com when a scan button is clicked.
 * Rendered inside a Shadow DOM so X's CSS can't affect it (and vice versa).
 *
 * API: SCANX.card.open(anchorEl, address, { onOpenTab(target) })  → shows loading,
 *      then fetches the report from the background worker and renders it.
 *      SCANX.card.close()
 */
(() => {
  "use strict";
  const { config, solana, risk } = globalThis.SCANX;

  const CSS = `
  :host{all:initial}
  .card{position:fixed;z-index:2147483646;width:340px;max-width:calc(100vw - 16px);max-height:calc(100vh - 16px);overflow:auto;
    box-sizing:border-box;border:1px solid #1f2a44;border-radius:14px;background:#070b16;color:#d6deeb;
    font:13px/1.35 -apple-system,BlinkMacSystemFont,"Segoe UI",Inter,Roboto,sans-serif;
    box-shadow:0 24px 64px rgba(0,0,0,.55),0 0 0 1px rgba(139,123,255,.08);opacity:0;transform:translateY(4px);transition:opacity .12s,transform .12s}
  .card.in{opacity:1;transform:none}
  .mono{font-family:"JetBrains Mono","SFMono-Regular",ui-monospace,Menlo,Consolas,monospace}
  .hd{display:flex;gap:10px;align-items:center;padding:12px 12px 10px;border-bottom:1px solid #151d33}
  .logo{width:36px;height:36px;border-radius:50%;flex-shrink:0;object-fit:cover;background:linear-gradient(135deg,#8b7bff55,#4fd1c533);display:flex;align-items:center;justify-content:center;font:700 11px/1 monospace;color:#fff}
  .ti{min-width:0;flex:1}.nm{font-weight:650;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#fff}
  .sym{color:#f5b73b;font-size:12px}.addr{color:#6f7f9c;font-size:11px;cursor:pointer}.addr:hover{color:#d6deeb}
  .x{all:unset;cursor:pointer;color:#6f7f9c;font-size:18px;line-height:1;padding:4px 6px;border-radius:6px}.x:hover{background:#121a2c;color:#fff}
  .risk{display:flex;align-items:center;gap:12px;padding:12px}
  .score{font:800 34px/1 "JetBrains Mono",ui-monospace,monospace}
  .lvl{font:600 10px/1 "JetBrains Mono",ui-monospace,monospace;letter-spacing:.1em;text-transform:uppercase}
  .bar{display:flex;gap:2px;margin-top:6px}.bar i{flex:1;height:6px;border-radius:2px;background:#151d33}
  .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;padding:0 12px 10px}
  .st{border:1px solid #151d33;border-radius:8px;padding:6px 8px;min-width:0}
  .lb{font:600 9px/1.2 "JetBrains Mono",ui-monospace,monospace;letter-spacing:.08em;text-transform:uppercase;color:#6f7f9c}
  .vl{font:600 13px/1.4 "JetBrains Mono",ui-monospace,monospace;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#e6ecf7}
  .up{color:#3ddc97}.dn{color:#ff4d6d}
  ul{list-style:none;margin:0;padding:2px 12px 8px}
  li{display:flex;gap:8px;align-items:flex-start;padding:5px 0;border-top:1px solid #10172a}
  li:first-child{border-top:0}
  .dot{width:8px;height:8px;border-radius:50%;margin-top:4px;flex-shrink:0}
  .fl{flex:1;min-width:0}.fd{color:#6f7f9c;font-size:11.5px}
  .pts{font:600 11px "JetBrains Mono",monospace;color:#ff4d6d}
  .acts{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;padding:10px 12px 12px;border-top:1px solid #151d33}
  .acts button{all:unset;box-sizing:border-box;text-align:center;cursor:pointer;padding:7px 0;border-radius:7px;border:1px solid #1f2a44;
    font:600 10.5px "JetBrains Mono",ui-monospace,monospace;letter-spacing:.04em;text-transform:uppercase;color:#c9d4e8}
  .acts button:hover{border-color:#f5b73b;color:#fff}
  .acts .primary{grid-column:1/-1;background:#f5b73b;border-color:#f5b73b;color:#120d02;padding:9px 0}
  .acts .primary:hover{filter:brightness(1.08);color:#120d02}
  .msg{padding:22px 16px;text-align:center;color:#9aa7c0}
  .spin{width:22px;height:22px;margin:0 auto 10px;border-radius:50%;border:2px solid #1f2a44;border-top-color:#f5b73b;animation:s .8s linear infinite}
  @keyframes s{to{transform:rotate(360deg)}}
  .note{padding:0 12px 10px;font-size:10.5px;color:#56637d}
  `;

  const COLORS = { ok: "#3ddc97", warn: "#f5b73b", danger: "#ff4d6d", info: "#56637d" };
  const LEVEL = { low: ["Low risk", "#3ddc97"], medium: ["Medium risk", "#f5b73b"], high: ["High risk", "#ff4d6d"] };

  let host = null;
  let root = null;
  let cardEl = null;
  let anchor = null;
  let reqId = 0;

  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const SUB = "₀₁₂₃₄₅₆₇₈₉";
  /** Tiny prices in DexScreener style: 0.0000031 → $0.0₅31 */
  function fmtTiny(n) {
    const zeros = -Math.floor(Math.log10(n)) - 1; // leading zeros after "0."
    if (zeros < 4) return n.toFixed(Math.min(8, zeros + 3)).replace(/0+$/, "");
    const digits = Math.round(n * 10 ** (zeros + 3)).toString().replace(/0+$/, "") || "0";
    return `0.0${String(zeros).split("").map((d) => SUB[d]).join("")}${digits}`;
  }
  const fmtUsd = (n) =>
    n === null || n === undefined ? "—" : n > 0 && n < 1 ? `$${n < 0.01 ? fmtTiny(n) : n.toFixed(4)}` : risk.formatUsd(n);
  const fmtNum = (n) => (n === null || n === undefined ? "—" : new Intl.NumberFormat("en-US", { notation: n >= 100000 ? "compact" : "standard", maximumFractionDigits: 1 }).format(n));

  function ensureHost() {
    if (host && document.contains(host)) return;
    host = document.createElement("div");
    host.className = "scanx-card-host";
    root = host.attachShadow({ mode: "open" });
    root.innerHTML = `<style>${CSS}</style><div class="card" role="dialog" aria-label="ScanX quick analysis"></div>`;
    cardEl = root.querySelector(".card");
    // Keep clicks inside the card from reaching X (would open the tweet).
    for (const t of ["click", "mousedown", "pointerdown", "mouseup", "pointerup"]) {
      cardEl.addEventListener(t, (e) => e.stopPropagation());
    }
    document.body.appendChild(host);
  }

  function position() {
    if (!anchor || !cardEl) return;
    const r = anchor.getBoundingClientRect();
    const w = cardEl.offsetWidth;
    const h = cardEl.offsetHeight;
    let top = r.bottom + 8;
    if (top + h > window.innerHeight - 8) top = Math.max(8, r.top - h - 8);
    const left = Math.min(Math.max(8, r.left - 20), window.innerWidth - w - 8);
    cardEl.style.top = `${top}px`;
    cardEl.style.left = `${left}px`;
  }

  function render(html) {
    const el = cardEl;
    if (!el) return;
    el.innerHTML = html;
    position();
    requestAnimationFrame(() => el.classList.add("in"));
  }

  function header(address, r) {
    const t = r && r.token;
    const sym = t && t.symbol ? t.symbol : null;
    const logo = t && t.logo
      ? `<img class="logo" src="${esc(t.logo)}" referrerpolicy="no-referrer" alt="">`
      : `<div class="logo">${esc((sym || "?").slice(0, 2).toUpperCase())}</div>`;
    return `<div class="hd">${logo}<div class="ti">
      <div class="nm">${esc((t && t.name) || (r && r.kind === "wallet" ? "Wallet" : "Token"))}${t && t.verified ? " ✓" : ""}</div>
      <div>${sym ? `<span class="sym mono">$${esc(sym)}</span> · ` : ""}<span class="addr mono" data-act="copy" title="Copy address">${esc(solana.shortAddress(address, 5, 5))} ⧉</span></div>
      </div><button class="x" data-act="close" aria-label="Close">×</button></div>`;
  }

  function actions(primaryLabel, primaryAct = "open:primary") {
    return `<div class="acts">
      <button class="primary" data-act="${primaryAct}">${esc(primaryLabel)}</button>
      <button data-act="open:dexscreener">Dex</button><button data-act="open:gmgn">GMGN</button>
      <button data-act="open:birdeye">Birdeye</button><button data-act="open:solscan">Solscan</button></div>`;
  }

  function renderReport(address, r, primaryLabel) {
    if (r.kind === "wallet") {
      return render(`${header(address, r)}<div class="msg">This is a <b>wallet</b>, not a token.<br>Balance: <span class="mono">${fmtNum(r.solBalance)} SOL</span></div>${actions("Open wallet on GMGN", "open:wallet")}`);
    }
    if (r.kind !== "token") {
      return render(`${header(address, null)}<div class="msg">Couldn't load token data${r.warnings && r.warnings.length ? `<br><span class="fd">${esc(r.warnings.join(" · "))}</span>` : ""}.</div>${actions(primaryLabel)}`);
    }
    const [lvlText, lvlColor] = LEVEL[r.risk.level] || ["Unknown", "#6f7f9c"];
    const lit = Math.round((r.risk.score / 100) * 20);
    const ch = r.market.priceChange24h;
    const stats = [
      ["Price", fmtUsd(r.market.priceUsd), ""],
      ["24h", ch === null || ch === undefined ? "—" : `${ch >= 0 ? "+" : ""}${ch.toFixed(1)}%`, ch === null || ch === undefined ? "" : ch >= 0 ? "up" : "dn"],
      ["MCap", fmtUsd(r.market.marketCap), ""],
      ["Liquidity", fmtUsd(r.market.liquidityUsd), ""],
      ["Vol 24h", fmtUsd(r.market.volume24h), ""],
      ["Age", r.age.createdAt ? risk.formatAge(r.age.createdAt) : "—", ""],
      ["Holders", fmtNum(r.market.holderCount), ""],
      ["Top 10", r.holders.top10Pct === undefined || r.holders.top10Pct === null ? "—" : `${r.holders.top10Pct.toFixed(1)}%`, ""],
      ["DEX", esc(r.market.dex || "—"), ""],
    ];
    render(`${header(address, r)}
      <div class="risk"><div class="score" style="color:${lvlColor}">${r.risk.score}</div>
        <div style="flex:1"><div class="lvl" style="color:${lvlColor}">${lvlText} · /100</div>
        <div class="bar">${Array.from({ length: 20 }, (_, i) => `<i style="${i < lit ? `background:${lvlColor}` : ""}"></i>`).join("")}</div></div></div>
      <div class="grid">${stats.map(([l, v, c]) => `<div class="st"><div class="lb">${l}</div><div class="vl ${c}">${v}</div></div>`).join("")}</div>
      <ul>${r.risk.factors.map((f) => `<li><span class="dot" style="background:${COLORS[f.status]}"></span><div class="fl"><div>${esc(f.label)}</div><div class="fd">${esc(f.detail)}</div></div>${f.points ? `<span class="pts">+${f.points}</span>` : ""}</li>`).join("")}</ul>
      ${r.warnings.length ? `<div class="note">Partial data: ${esc(r.warnings.join(" · "))}</div>` : ""}
      <div class="note">Heuristic, not financial advice. DYOR.</div>
      ${actions(primaryLabel)}`);
  }

  function onDocPointer(e) {
    if (!host) return;
    if (e.composedPath().includes(host)) return;
    if (e.target.closest && e.target.closest(".scanx-btn")) return;
    close();
  }
  function onKey(e) {
    if (e.key === "Escape") close();
  }

  function close() {
    reqId++;
    if (host) host.remove();
    host = root = cardEl = anchor = null;
    document.removeEventListener("pointerdown", onDocPointer, true);
    document.removeEventListener("keydown", onKey, true);
    window.removeEventListener("resize", position);
    window.removeEventListener("scroll", position, true);
  }

  /**
   * @param {Element} anchorEl
   * @param {string} address
   * @param {{ primaryLabel: string, onOpen: (target: string) => void, analyze: (address) => Promise<object> }} opts
   */
  function open(anchorEl, address, opts) {
    close();
    ensureHost();
    anchor = anchorEl;
    const my = ++reqId;

    cardEl.onclick = (e) => {
      const btn = e.target.closest("[data-act]");
      if (!btn) return;
      const act = btn.dataset.act;
      if (act === "close") return close();
      if (act === "copy") {
        navigator.clipboard?.writeText(address);
        btn.textContent = "copied ✓";
        return;
      }
      if (act.startsWith("open:")) opts.onOpen(act.slice(5));
    };

    render(`${header(address, null)}<div class="msg"><div class="spin"></div>Scanning token…</div>`);
    document.addEventListener("pointerdown", onDocPointer, true);
    document.addEventListener("keydown", onKey, true);
    window.addEventListener("resize", position);
    window.addEventListener("scroll", position, true);

    opts
      .analyze(address)
      .then((r) => {
        if (my !== reqId || !cardEl) return;
        renderReport(address, r || { kind: "unknown", warnings: [] }, opts.primaryLabel);
      })
      .catch((e) => {
        if (my !== reqId || !cardEl) return;
        renderReport(address, { kind: "unknown", warnings: [String(e && e.message ? e.message : e)] }, opts.primaryLabel);
      });
  }

  globalThis.SCANX.card = { open, close };
})();
