# ScanX — Web

Solana CA analyzer & smart-money wallet tracker for Crypto Twitter.
Next.js 15 (App Router) · TypeScript · Tailwind CSS v4 · shadcn/ui-compatible components · Solana Wallet Adapter.

## Features (MVP)

| Area | What it does |
|---|---|
| **Analyze CA** (`/`, `/ca/[address]`) | Paste a CA or any link that contains one (DexScreener, pump.fun, Birdeye…). Report: name/symbol/logo, price, market cap, FDV, liquidity, 24h volume, age, holder count, mint/freeze authority, Token-2022 extensions, top-10 holders (LP / bonding-curve accounts detected and excluded from concentration), pools, links to DexScreener / Birdeye / GMGN / Solscan, **risk score 0–100** where every point is explained. |
| **Wallet tracker** (`/tracker`) | Add wallets, label them, tag them (Smart Money, KOL, Whale, Insider, Sniper, Dev, My Wallet), filter by tag. Detail: SOL balance, net worth, top tokens by USD value, last 20 transactions. One-click “track” for any top holder in a token report. |
| **Saved** (`/saved`) | Watchlist of tokens, tracked wallets, scan history. |
| **Pro** (`/pricing`) | Monetization: user pays SOL to your treasury wallet from Phantom/Solflare/Backpack → server verifies the tx on-chain → issues an HMAC-signed license (no DB, no Stripe). Pro raises limits and unlocks export; hooks are ready for alerts. |
| **Public API** | `GET /api/analyze?ca=`, `GET /api/wallet?address=`, `POST /api/pro/verify`, `GET /api/pro/status` — CORS-enabled for the browser extension. |

Data sources are free and key-less: Solana JSON-RPC, DexScreener, Jupiter lite-api, Metaplex on-chain metadata. Each source fails soft — the report still renders and lists which source was unavailable.

## Run locally

```bash
cd scanx/web
cp .env.example .env.local     # adjust values (see below)
npm install
npm run dev                    # http://localhost:3000
```

Other scripts: `npm run build`, `npm start`, `npm run typecheck`.

## Environment variables

| Var | Side | Purpose |
|---|---|---|
| `SOLANA_RPC_URL` | server | RPC for API routes. Public mainnet works but rate-limits `getTokenLargestAccounts`; a **free Helius key** (`https://mainnet.helius-rpc.com/?api-key=…`) is strongly recommended. |
| `LICENSE_SECRET` | server | Signs Pro licenses. **Required in production** (`openssl rand -hex 32`). |
| `NEXT_PUBLIC_SOLANA_RPC_URL` | client | RPC the wallet uses to send the payment tx. |
| `NEXT_PUBLIC_TREASURY_ADDRESS` | client | Your wallet that receives Pro payments. Empty = payments disabled. |
| `NEXT_PUBLIC_PRO_PRICE_SOL` | client | Price for 30 days of Pro (default `0.2`). |
| `NEXT_PUBLIC_SITE_URL` | client | Canonical URL (metadata). |
| `NEXT_PUBLIC_EXTENSION_URL` | client | Chrome Web Store link for the “Get extension” button. |

> `NEXT_PUBLIC_*` values are inlined at **build time** — redeploy after changing them.

## Deploy to Vercel

1. Import the repo in Vercel, set **Root Directory** = `scanx/web`.
2. Add the env vars above (at minimum `SOLANA_RPC_URL`, `LICENSE_SECRET`, `NEXT_PUBLIC_TREASURY_ADDRESS`).
3. Deploy. Point your domain (e.g. `scanx.app`) at the project and set the same domain in the extension (`scanx/extension/src/shared/config.js`).

## Project structure

```
src/
  app/
    page.tsx                 home + CA input
    ca/[address]/page.tsx    deep-linkable report (extension target)
    tracker/ saved/ pricing/
    api/analyze | wallet | pro/verify | pro/status
  components/
    ui/                      shadcn-style primitives (button, card, input, badge…)
    token/                   report, risk panel, holders
    wallet/                  tracker list + detail
  lib/
    server/                  RPC client, data sources, analyzers, cache, licenses
    client/                  localStorage store (swap for Supabase), plan gating, API hooks
    risk.ts                  pure risk-scoring rules (shared by UI/API/extension)
    types.ts                 API contracts (versioned)
    config.ts                brand, limits, external links
```

## Extending

- **Database (Supabase)**: replace read/write in `src/lib/client/store.ts`; hooks stay the same. Store licenses server-side too (prevents a tx signature being reused by another wallet, enables stacking renewals).
- **Alerts**: tracked wallets are already structured; add a cron (Vercel Cron) that polls `getSignaturesForAddress` for Pro users and pushes to Telegram.
- **Extension quick-card**: call `/api/analyze?ca=` from the extension (CORS is open) and render `risk` + `market`.
- **Caching at scale**: `src/lib/server/cache.ts` is in-memory per instance; swap for Upstash Redis.

## Monetization notes

- Free tier is useful on its own (unlimited scans) — the hook. Limits on tracked wallets/watchlist drive upgrades; toasts link to `/pricing`.
- Payments go wallet → treasury directly: 0% processor fees, no KYC/Stripe account needed.
- Next revenue levers: referral links on DexScreener/GMGN/trading bots buttons, paid API keys for `/api/analyze`, Telegram alerts as a Pro feature.

Not financial advice — the risk score is a heuristic.
