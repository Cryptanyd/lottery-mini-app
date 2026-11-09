# ScanX — Browser Extension (Chrome · Brave · Edge)

Finds Solana contract addresses (CAs) in tweets on X and adds a small scan button next to each one. One click opens the full ScanX report: `https://scanx.app/ca/{address}`.

## Features (v0.1.0)

- Detects CAs in tweets, replies, quote tweets, link text (e.g. `dexscreener.com/solana/<CA>`) and, optionally, profile bios
- Validation: base58, 32–44 chars, **must decode to exactly 32 bytes** — tx signatures and random words are ignored
- Works with infinite scroll (MutationObserver + idle-time scanning, idempotent inserts)
- Follows X's theme automatically (Default / Dim / Lights out)
- Tooltip “Analyze on ScanX” with the short address
- **Quick risk card right inside X** (no server needed): risk score, mint/freeze authority, top-10 holders ex-LP, liquidity, mcap, volume, age, holders — data from Solana RPC, DexScreener and Jupiter, fetched by the background worker
- Clicks never open the underlying tweet (window-level capture guard)
- Popup: status on the current tab (“Active on X · N CAs found”), quick-scan input, settings, recent scans
- Permissions: `storage` + host access to the public APIs above. No access to your browsing data, no tracking

## Where reports open

- In the popup, **Open reports in**: ScanX (your site), DexScreener, GMGN or Birdeye.
- **Your ScanX site**: paste your deployed URL (e.g. `https://scanx-xxx.vercel.app`) — no rebuild needed.
- While no site is configured, reports open on DexScreener.
- To bake a default site into a build: `./scripts/pack.sh https://your-domain.com` (or set `SCANX_BASE_URL` in `src/shared/config.js`).

Prebuilt zip for developer-mode testing: [`release/ScanX-extension.zip`](release/ScanX-extension.zip).

## Install for testing (developer mode)

1. Open `chrome://extensions` (Brave: `brave://extensions`, Edge: `edge://extensions`).
2. Turn on **Developer mode** (top-right toggle; in Edge it's in the left sidebar).
3. Click **Load unpacked** and select the `scanx/extension` folder (the one that contains `manifest.json`).
4. Pin ScanX from the puzzle-piece menu so the icon is visible.
5. Open (or reload) `https://x.com` — scan buttons appear next to every CA.

After editing code: press the ↻ reload icon on the ScanX card in `chrome://extensions`, then reload the X tab.

Quick test: search X for `DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263` (BONK) and click the reticle button.

## Publish

Full step-by-step guide (RU): **[PUBLISH.md](PUBLISH.md)**. Store texts, privacy answers and images are in [`store/`](store/LISTING.md).

```bash
./scripts/pack.sh https://your-domain.com   # -> dist/scanx-extension-v0.1.0.zip with your domain baked in
```

Upload the zip to the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole) (one-time $5 fee) and to [Edge Add-ons](https://partner.microsoft.com/dashboard/microsoftedge) (free). Brave installs from the Chrome Web Store. Use `PRIVACY.md` as the privacy policy. Regenerate PNG icons from `icons/icon.svg` with `node scripts/build-icons.js` (needs Playwright).

## Structure

```
manifest.json                  MV3 manifest
src/shared/config.js           domain + defaults (SCANX_BASE_URL)
src/shared/solana.js           base58 / address validation
src/content/detector.js        findAddresses(text) — pure, reusable
src/content/content.js         DOM scanning, buttons, tooltip, observer, theme
src/content/content.css        in-page styles (scanx- prefixed)
src/background/service-worker.js  opens report tabs, keeps local history
src/popup/                     popup UI
icons/                         16/32/48/128 PNG + SVG source
```

## Roadmap hooks

- **Quick-analysis card on hover**: `showTooltip()` in `content.js` is the hook — fetch `${BASE_URL}/api/analyze?ca=` (CORS enabled on the site) and render risk score + mcap + liquidity.
- **CA highlighting**: use the CSS Custom Highlight API (no DOM mutation of X's React tree).
- **History**: already stored in `chrome.storage.local.history` (last 50); can sync to the site after wallet login.
- **Pro in extension**: pass the license to `GET /api/pro/status` (`Authorization: Bearer <license>`).
