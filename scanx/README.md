# ScanX

Solana tooling for Crypto Twitter.

| Folder | What |
|---|---|
| [`web/`](web/README.md) | Next.js app: CA analyzer with risk score, wallet tracker, watchlist/history, Pro plan paid in SOL, public JSON API |
| [`extension/`](extension/README.md) | Chrome/Brave/Edge MV3 extension: finds CAs in tweets and opens the ScanX report in one click |

Quick start:

```bash
cd scanx/web && cp .env.example .env.local && npm install && npm run dev
# then load scanx/extension as an unpacked extension (see extension/README.md)
# and set SCANX_BASE_URL in extension/src/shared/config.js to http://localhost:3000 for local testing
```
