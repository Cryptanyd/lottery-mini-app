# ScanX Extension — Privacy Policy

_Last updated: 2026-11-09_

- The extension reads the text of pages on x.com / twitter.com **locally in your browser** only to find Solana contract addresses. Page content is never sent anywhere.
- When you click a scan button, the extension looks up **only that contract address** in public blockchain/market APIs (Solana RPC, DexScreener, Jupiter) to show the quick risk card. No page content, account data or identifiers are sent.
- If you choose to open a report, a new tab opens on the selected site (your ScanX site, DexScreener, GMGN, Birdeye or Solscan) with the address in the URL.
- An optional Solana RPC URL you enter (e.g. Helius) is stored in `chrome.storage.sync` and only used for these lookups.
- Settings are stored in `chrome.storage.sync`; the list of addresses you opened (optional, can be turned off and cleared) is stored in `chrome.storage.local` on your device only.
- No analytics, no tracking, no personal data collection, no remote code.
- Permissions: `storage`; host access to `api.dexscreener.com`, `lite-api.jup.ag`, `api.mainnet-beta.solana.com`, `mainnet.helius-rpc.com` for the lookups above.

Contact: open an issue in the project repository.
