/**
 * Shared API contracts. These shapes are returned by /api/* and consumed by
 * the web app and (later) the browser extension — keep them backwards compatible
 * and bump `version` on breaking changes.
 */

export type RiskLevel = "low" | "medium" | "high" | "unknown";
export type FactorStatus = "ok" | "warn" | "danger" | "info";

export interface RiskFactor {
  id: string;
  label: string;
  detail: string;
  status: FactorStatus;
  /** Points this factor added to the risk score (0 = no penalty). */
  points: number;
}

export interface Holder {
  rank: number;
  /** Token account address */
  account: string;
  /** Wallet that owns the token account (null if it could not be resolved) */
  owner: string | null;
  amount: number;
  pct: number;
  /** Heuristic label: liquidity pool / bonding curve / program-owned account */
  tag: "lp" | "program" | null;
}

export interface MarketPair {
  dex: string;
  pairAddress: string;
  url: string;
  priceUsd: number | null;
  liquidityUsd: number | null;
  volume24h: number | null;
  priceChange24h: number | null;
  createdAt: number | null;
}

export interface TokenReport {
  version: 1;
  address: string;
  fetchedAt: number;
  /** Non-fatal notes about data sources that failed (rate limits etc). */
  warnings: string[];

  token: {
    name: string | null;
    symbol: string | null;
    logo: string | null;
    decimals: number | null;
    supply: number | null;
    program: "spl-token" | "token-2022" | "unknown";
    extensions: string[];
    website: string | null;
    twitter: string | null;
    telegram: string | null;
    verified: boolean;
  };

  authorities: {
    mint: string | null;
    freeze: string | null;
  };

  market: {
    priceUsd: number | null;
    marketCap: number | null;
    fdv: number | null;
    liquidityUsd: number | null;
    volume24h: number | null;
    priceChange24h: number | null;
    pairs: MarketPair[];
    holderCount: number | null;
  };

  age: {
    createdAt: number | null;
    /** Where the timestamp came from */
    source: "pair" | "jupiter" | "chain" | null;
    /** true when the chain lookup hit the page limit (token is at least this old) */
    approximate: boolean;
  };

  holders: {
    top: Holder[];
    top10Pct: number | null;
    /** Top-10 concentration excluding detected LP / program accounts */
    top10PctExLp: number | null;
  };

  risk: {
    score: number;
    level: RiskLevel;
    factors: RiskFactor[];
  };
}

export interface WalletToken {
  mint: string;
  amount: number;
  decimals: number;
  symbol: string | null;
  name: string | null;
  logo: string | null;
  priceUsd: number | null;
  valueUsd: number | null;
}

export interface WalletTx {
  signature: string;
  blockTime: number | null;
  ok: boolean;
  memo: string | null;
}

export interface WalletReport {
  version: 1;
  address: string;
  fetchedAt: number;
  warnings: string[];
  solBalance: number;
  solPriceUsd: number | null;
  solValueUsd: number | null;
  tokensValueUsd: number | null;
  totalValueUsd: number | null;
  tokenCount: number;
  tokens: WalletToken[];
  transactions: WalletTx[];
}

export interface ApiError {
  error: string;
  code: "invalid_address" | "not_a_token" | "upstream" | "rate_limited" | "bad_request" | "unauthorized";
}
