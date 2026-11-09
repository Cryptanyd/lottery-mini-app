/**
 * Generates Chrome Web Store listing images into store/:
 *   screenshot-1-feed.png      1280x800  buttons on a timeline + tooltip
 *   screenshot-2-report.png    1280x800  the ScanX report page (needs the site running)
 *   screenshot-3-popup.png     1280x800  light theme + popup
 *   promo-small-440x280.png    small promo tile (required)
 *   promo-marquee-1400x560.png marquee promo tile (optional)
 *
 * Usage:
 *   node scripts/store-assets.js [siteUrl]     # siteUrl default http://localhost:3000
 * Requires Playwright + Chromium. The report screenshot uses a fictional demo token
 * (scripts/fixtures/demo-report.json) served in place of /api/analyze.
 */
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "store");
const SITE = (process.argv[2] || "http://localhost:3000").replace(/\/$/, "");
const SIZE = { width: 1280, height: 800 };

const report = JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures/demo-report.json"), "utf8"));
const now = Date.now();
report.fetchedAt = now;
report.age.createdAt = now - (19 * 60 + 12) * 60_000;
report.market.pairs.forEach((p) => (p.createdAt = report.age.createdAt));
const DEMO_CA = report.address;
const CA_B = "4368N9GjJpDi1ZkHhFJbnBrYn7pMPAByw7RHzir6E5vf";
const CA_C = "JBce8ZcwKpqEDugbpoV2oe94rKg5hZdja7SrztvVKqpC";

const iconSvg = fs.readFileSync(path.join(ROOT, "icons/icon.svg"), "utf8");
const iconData = `data:image/svg+xml;base64,${Buffer.from(iconSvg).toString("base64")}`;

/* --------------------------- shared HTML bits --------------------------- */

const FONT = `-apple-system,BlinkMacSystemFont,"Segoe UI",Inter,Roboto,sans-serif`;
const MONO = `"JetBrains Mono","SFMono-Regular",ui-monospace,Menlo,Consolas,monospace`;

function pitch({ kicker, title, bullets }) {
  return `
  <aside class="pitch">
    <div class="brand"><img src="${iconData}" width="40" height="40"/><span>Scan<b>X</b></span></div>
    <div class="kicker">${kicker}</div>
    <h1>${title}</h1>
    <ul>${bullets.map((b) => `<li>${b}</li>`).join("")}</ul>
  </aside>`;
}

const PITCH_CSS = `
.pitch{width:430px;flex-shrink:0;padding:56px 44px;box-sizing:border-box;color:#d6deeb;font-family:${FONT};
  background:radial-gradient(520px 320px at 0% 0%,rgba(245,183,59,.14),transparent 70%),radial-gradient(520px 360px at 100% 100%,rgba(139,123,255,.18),transparent 70%),#06080f;
  border-right:1px solid #1a2338;display:flex;flex-direction:column}
.brand{display:flex;align-items:center;gap:12px;font:700 24px ${MONO};letter-spacing:-.02em}.brand b{color:#f5b73b}
.brand img{border-radius:9px}
.kicker{margin-top:64px;font:600 12px ${MONO};letter-spacing:.12em;text-transform:uppercase;color:#4fd1c5}
h1{margin:14px 0 0;font-size:38px;line-height:1.12;font-weight:650;letter-spacing:-.02em;color:#fff}
ul{margin:30px 0 0;padding:0;list-style:none}li{position:relative;padding-left:26px;margin:14px 0;font-size:16.5px;color:#aab6cc;line-height:1.4}
li:before{content:"";position:absolute;left:2px;top:7px;width:9px;height:9px;border-radius:50%;background:#f5b73b;box-shadow:0 0 0 4px rgba(245,183,59,.15)}`;

function tweet({ name, handle, color, time, html, quote }) {
  return `
  <article>
    <div class="av" style="background:${color}">${name[0]}</div>
    <div class="body">
      <div class="meta"><b>${name}</b><span>@${handle} · ${time}</span></div>
      <div data-testid="tweetText" class="txt">${html}</div>
      ${quote ? `<div class="quote"><div class="meta"><b>${quote.name}</b><span>@${quote.handle}</span></div><div data-testid="tweetText" class="txt">${quote.html}</div></div>` : ""}
      <div class="acts"><span>💬 ${Math.floor(Math.random() * 90 + 10)}</span><span>🔁 ${Math.floor(Math.random() * 300 + 20)}</span><span>♡ ${Math.floor(Math.random() * 900 + 50)}</span><span>▥ ${Math.floor(Math.random() * 90 + 10)}K</span></div>
    </div>
  </article>`;
}

function feedPage({ light, pitchHtml, extra = "" }) {
  const bg = light ? "#ffffff" : "#000000";
  const fg = light ? "#0f1419" : "#e7e9ea";
  const muted = light ? "#536471" : "#71767b";
  const line = light ? "#eff3f4" : "#2f3336";
  return `<!doctype html><html><head><meta charset="utf-8"><style>
  html,body{margin:0;height:100%;overflow:hidden}body{background:${bg};color:${fg};font:15px/20px ${FONT}}
  .wrap{display:flex;height:100%}
  ${PITCH_CSS}
  .feed{flex:1;display:flex;justify-content:center;overflow:hidden}
  main{width:600px;border-left:1px solid ${line};border-right:1px solid ${line}}
  .tabs{display:flex;border-bottom:1px solid ${line};height:53px}.tabs div{flex:1;display:flex;align-items:center;justify-content:center;color:${muted};font-weight:500}
  .tabs div.on{color:${fg};font-weight:700;box-shadow:inset 0 -4px 0 -0px #1d9bf0;box-shadow:none;position:relative}
  .tabs div.on:after{content:"";position:absolute;bottom:0;width:56px;height:4px;border-radius:2px;background:#1d9bf0}
  article{display:flex;gap:12px;padding:12px 16px;border-bottom:1px solid ${line}}
  .av{width:40px;height:40px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700}
  .body{min-width:0;flex:1}.meta{display:flex;gap:4px;align-items:baseline}.meta span{color:${muted}}
  .txt{margin-top:2px;white-space:pre-wrap;word-wrap:break-word}a{color:#1d9bf0;text-decoration:none}
  .quote{margin-top:10px;border:1px solid ${line};border-radius:16px;padding:10px 12px}
  .acts{display:flex;justify-content:space-between;max-width:425px;margin-top:10px;color:${muted};font-size:13px}
  </style></head><body><div class="wrap">${pitchHtml}<div class="feed"><main>
  <div class="tabs"><div class="on">For you</div><div>Following</div></div>
  ${tweet({ name: "Degen Dan", handle: "degendan", color: "#f97316", time: "3m", html: `just aped this, dev seems based 🐱\n\nCA: <span>${DEMO_CA}</span>\n\nnfa dyor` })}
  ${tweet({ name: "Chart Wizard", handle: "chartwiz", color: "#8b5cf6", time: "11m", html: `<span>volume picking up on this one 👀 </span><a href="#"><span>dexscreener.com/solana/${CA_B}</span></a>` })}
  ${tweet({ name: "Sol Alpha", handle: "solalpha", color: "#10b981", time: "26m", html: `<span>watching this one closely</span>`, quote: { name: "Early Caller", handle: "earlycaller", html: `<span>new launch → ${CA_C}</span>` } })}
  ${tweet({ name: "Memecoin Mike", handle: "mikememes", color: "#0ea5e9", time: "1h", html: `<span>gm. remember: always check mint & freeze authority before buying anything</span>` })}
  </main></div></div>${extra}</body></html>`;
}

/* -------------------------------- run -------------------------------- */

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const ctx = await chromium.launchPersistentContext("", {
    headless: true,
    channel: "chromium",
    args: [`--disable-extensions-except=${ROOT}`, `--load-extension=${ROOT}`],
    viewport: SIZE,
    deviceScaleFactor: 1,
  });
  let current = "";
  await ctx.route("https://x.com/**", (r) => r.fulfill({ contentType: "text/html", body: current }));

  let [sw] = ctx.serviceWorkers();
  if (!sw) sw = await ctx.waitForEvent("serviceworker");
  const extId = sw.url().split("/")[2];
  await new Promise((r) => setTimeout(r, 600));
  for (const p of ctx.pages()) if (!p.url().startsWith("about:")) await p.close().catch(() => {});

  const page = await ctx.newPage();

  // 1. Feed with buttons + tooltip (dark)
  current = feedPage({
    light: false,
    pitchHtml: pitch({
      kicker: "Solana · Crypto Twitter",
      title: "Scan any CA without leaving your feed",
      bullets: [
        "Auto-detects Solana contract addresses in tweets, replies & quotes",
        "One click opens a full risk report",
        "Works with infinite scroll",
      ],
    }),
  });
  await page.goto("https://x.com/home");
  await page.waitForSelector(".scanx-btn", { timeout: 10000 });
  await page.waitForTimeout(400);
  await page.hover(`.scanx-btn[data-scanx-addr="${DEMO_CA}"]`);
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(OUT, "screenshot-1-feed.png") });
  console.log("✓ screenshot-1-feed.png");

  // 3. Light theme + popup
  await sw.evaluate(
    (h) => chrome.storage.local.set({ history: h }),
    [DEMO_CA, CA_B, CA_C].map((a, i) => ({ address: a, at: Date.now() - (i * 7 + 1) * 60_000, from: null })),
  );
  const pop = await ctx.newPage();
  await pop.setViewportSize({ width: 340, height: 600 });
  await pop.goto(`chrome-extension://${extId}/src/popup/popup.html`);
  await pop.waitForTimeout(500);
  // Show the state the popup has on an X tab (when opened as a page it can't see one).
  await pop.evaluate(() => {
    document.getElementById("status").dataset.state = "active";
    document.getElementById("status-title").textContent = "Active on X";
    document.getElementById("status-sub").textContent = "3 contract addresses found on this page";
  });
  const popPng = await pop.locator("body").screenshot();
  await pop.close();
  const popData = `data:image/png;base64,${popPng.toString("base64")}`;

  current = feedPage({
    light: true,
    pitchHtml: pitch({
      kicker: "Zero setup",
      title: "Light or dark — it just fits in",
      bullets: [
        "Matches every X theme automatically",
        "Quick-scan any CA from the toolbar",
        "Only one permission: storage. No tracking",
      ],
    }),
    extra: `<img src="${popData}" style="position:fixed;top:14px;right:22px;width:340px;border-radius:12px;box-shadow:0 24px 60px rgba(15,20,25,.35),0 0 0 1px rgba(15,20,25,.08)"/>`,
  });
  await page.goto("https://x.com/home");
  await page.waitForSelector(".scanx-btn", { timeout: 10000 });
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(OUT, "screenshot-3-popup.png") });
  console.log("✓ screenshot-3-popup.png");

  // 2. Report page on the site
  try {
    const site = await ctx.newPage();
    await site.route("**/api/analyze**", (r) =>
      r.fulfill({ contentType: "application/json", body: JSON.stringify(report) }),
    );
    await site.goto(`${SITE}/ca/${DEMO_CA}`, { timeout: 15000 });
    await site.waitForSelector("text=Risk score", { timeout: 15000 });
    await site.addStyleTag({ content: "nextjs-portal{display:none!important}" });
    await site.waitForTimeout(600);
    await site.screenshot({ path: path.join(OUT, "screenshot-2-report.png") });
    console.log("✓ screenshot-2-report.png");
  } catch (e) {
    console.warn(`⚠ skipped screenshot-2-report.png (site not reachable at ${SITE}): ${e.message.split("\n")[0]}`);
  }

  // Promo tiles
  const tile = (w, h, big) => `<!doctype html><html><head><style>
    html,body{margin:0;width:${w}px;height:${h}px;overflow:hidden}
    body{font-family:${FONT};color:#fff;display:flex;align-items:center;gap:${big ? 64 : 22}px;padding:0 ${big ? 110 : 34}px;box-sizing:border-box;
      background:radial-gradient(${w * 0.7}px ${h}px at 100% 0%,rgba(139,123,255,.35),transparent 70%),radial-gradient(${w * 0.6}px ${h}px at 0% 100%,rgba(245,183,59,.22),transparent 70%),
      linear-gradient(to right,rgba(26,35,56,.6) 1px,transparent 1px),linear-gradient(to bottom,rgba(26,35,56,.6) 1px,transparent 1px),#06080f;
      background-size:auto,auto,${big ? 40 : 22}px ${big ? 40 : 22}px,${big ? 40 : 22}px ${big ? 40 : 22}px,auto}
    img{width:${big ? 220 : 104}px;height:${big ? 220 : 104}px;border-radius:${big ? 44 : 22}px;box-shadow:0 0 80px rgba(245,183,59,.25)}
    .n{font:800 ${big ? 92 : 44}px/1 ${MONO};letter-spacing:-.03em}.n b{color:#f5b73b}
    .t{margin-top:${big ? 20 : 10}px;font-size:${big ? 34 : 17}px;line-height:1.25;color:#c7d1e3;font-weight:500}
    .k{margin-top:${big ? 26 : 12}px;font:600 ${big ? 18 : 10.5}px ${MONO};letter-spacing:.12em;text-transform:uppercase;color:#4fd1c5}
    </style></head><body><img src="${iconData}"/><div><div class="n">Scan<b>X</b></div>
    <div class="t">Solana CA scanner${big ? " for X" : "<br/>for X"}</div><div class="k">One click · Risk report</div></div></body></html>`;
  for (const [w, h, name, big] of [
    [440, 280, "promo-small-440x280.png", false],
    [1400, 560, "promo-marquee-1400x560.png", true],
  ]) {
    const p = await ctx.newPage();
    await p.setViewportSize({ width: w, height: h });
    await p.setContent(tile(w, h, big));
    await p.waitForTimeout(150);
    await p.screenshot({ path: path.join(OUT, name) });
    await p.close();
    console.log(`✓ ${name}`);
  }

  await ctx.close();
})();
