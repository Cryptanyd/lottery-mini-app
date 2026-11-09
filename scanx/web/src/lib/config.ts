/**
 * Central configuration. Anything brand- or deployment-specific lives here
 * so the product can be renamed / re-pointed in one place.
 */
export const APP_NAME = "ScanX";
export const APP_TAGLINE = "Solana CA analyzer & smart-money tracker";

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://scanx.app";

/** Server-side RPC (API routes). Falls back to the public mainnet endpoint. */
export const SERVER_RPC_URL =
  process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";

/** Client-side RPC (wallet adapter, Pro payment). */
export const PUBLIC_RPC_URL =
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";

/** Chrome Web Store listing (replace after publishing the extension). */
export const EXTENSION_URL =
  process.env.NEXT_PUBLIC_EXTENSION_URL ?? "https://github.com/cryptanyd/lottery-mini-app/tree/main/scanx/extension";

export const TREASURY_ADDRESS = process.env.NEXT_PUBLIC_TREASURY_ADDRESS ?? "";
export const PRO_PRICE_SOL = Number(process.env.NEXT_PUBLIC_PRO_PRICE_SOL ?? "0.2");
export const PRO_PERIOD_DAYS = 30;

/** Free-tier limits. Pro removes them. */
export const LIMITS = {
  free: { trackedWallets: 5, savedTokens: 15, history: 20 },
  pro: { trackedWallets: 500, savedTokens: 1000, history: 200 },
} as const;

export const EXTERNAL = {
  dexscreener: (ca: string) => `https://dexscreener.com/solana/${ca}`,
  birdeye: (ca: string) => `https://birdeye.so/token/${ca}?chain=solana`,
  gmgn: (ca: string) => `https://gmgn.ai/sol/token/${ca}`,
  solscanToken: (ca: string) => `https://solscan.io/token/${ca}`,
  solscanAccount: (a: string) => `https://solscan.io/account/${a}`,
  solscanTx: (sig: string) => `https://solscan.io/tx/${sig}`,
  gmgnWallet: (a: string) => `https://gmgn.ai/sol/address/${a}`,
  birdeyeWallet: (a: string) => `https://birdeye.so/profile/${a}?chain=solana`,
};
