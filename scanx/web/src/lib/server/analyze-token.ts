import type { Holder, MarketPair, TokenReport } from "@/lib/types";
import { computeRisk } from "@/lib/risk";
import { soft } from "./http";
import { metadataImage, metaplexMetadata } from "./metadata";
import {
  rpc,
  SYSTEM_PROGRAM,
  TOKEN_2022_PROGRAM,
  TOKEN_PROGRAM,
  type ParsedAccount,
  type RpcValue,
} from "./rpc";
import { dexTokenPairs, jupTokens, type DexPair } from "./sources";

/** Well-known AMM authorities that own pool vaults (labelled as LP, excluded from concentration). */
const KNOWN_LP_OWNERS = new Set([
  "5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1", // Raydium AMM v4 authority
  "GpMZbSM2GgvTKHJirzeGfMFoaZ8UR2X7F4v8vHTvxFbL", // Raydium CPMM authority
  "WLHv2UAZm6z4KyaaELi5pjdbJh6RESMva1Rnn8pJVVh", // Meteora DAMM v2 authority
]);

export class AnalyzeError extends Error {
  constructor(
    public code: "not_found" | "not_a_token",
    message: string,
    public hint?: "wallet",
  ) {
    super(message);
  }
}

interface MintInfo {
  decimals: number;
  supply: string;
  mintAuthority: string | null;
  freezeAuthority: string | null;
  extensions?: { extension: string; state?: { name?: string; symbol?: string; uri?: string } }[];
}

export async function analyzeToken(address: string): Promise<TokenReport> {
  const warnings: string[] = [];

  // 1. The mint account is the one call that must succeed.
  const acc = await rpc<RpcValue<ParsedAccount<MintInfo> | null>>("getAccountInfo", [
    address,
    { encoding: "jsonParsed" },
  ]);
  if (!acc.value) throw new AnalyzeError("not_found", "Account not found on Solana mainnet");

  const program =
    acc.value.owner === TOKEN_PROGRAM ? "spl-token" : acc.value.owner === TOKEN_2022_PROGRAM ? "token-2022" : null;
  const parsed = !Array.isArray(acc.value.data) ? acc.value.data.parsed : undefined;
  if (!program || parsed?.type !== "mint") {
    // Most common user mistake: pasting a wallet. Let the UI route to the tracker.
    const isWallet = acc.value.owner === SYSTEM_PROGRAM;
    throw new AnalyzeError(
      "not_a_token",
      isWallet ? "This is a wallet address, not a token mint" : "Address is not an SPL token mint",
      isWallet ? "wallet" : undefined,
    );
  }
  const mint = parsed.info;
  const decimals = mint.decimals;
  const supply = Number(mint.supply) / 10 ** decimals;
  const extensions = (mint.extensions ?? []).map((e) => e.extension);
  const ext2022Meta = mint.extensions?.find((e) => e.extension === "tokenMetadata")?.state;

  // 2. Fan out to everything else in parallel; failures degrade gracefully.
  const [pairs, jup, largest, metaplex] = await Promise.all([
    soft(dexTokenPairs([address]), [] as DexPair[], warnings, "DexScreener"),
    soft(jupTokens([address]).then((l) => l.find((t) => t.id === address) ?? null), null, warnings, "Jupiter"),
    soft(
      rpc<RpcValue<{ address: string; uiAmount: number | null; amount: string }[]>>("getTokenLargestAccounts", [
        address,
      ]),
      null,
      warnings,
      "Holders",
    ),
    ext2022Meta ? Promise.resolve(null) : soft(metaplexMetadata(address), null, warnings, "Metadata"),
  ]);

  // Pairs where our token is the base, sorted by liquidity.
  const ownPairs = pairs
    .filter((p) => p.baseToken?.address === address || p.quoteToken?.address === address)
    .sort((a, b) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0));
  const main = ownPairs.find((p) => p.baseToken.address === address) ?? ownPairs[0];

  const marketPairs: MarketPair[] = ownPairs.slice(0, 8).map((p) => ({
    dex: p.dexId,
    pairAddress: p.pairAddress,
    url: p.url,
    priceUsd: p.priceUsd ? Number(p.priceUsd) : null,
    liquidityUsd: p.liquidity?.usd ?? null,
    volume24h: p.volume?.h24 ?? null,
    priceChange24h: p.priceChange?.h24 ?? null,
    createdAt: p.pairCreatedAt ?? null,
  }));

  // 3. Metadata, by source priority.
  const name = main?.baseToken?.name || jup?.name || ext2022Meta?.name || metaplex?.name || null;
  const symbol = main?.baseToken?.symbol || jup?.symbol || ext2022Meta?.symbol || metaplex?.symbol || null;
  let logo = main?.info?.imageUrl || jup?.icon || null;
  if (!logo) logo = await metadataImage(ext2022Meta?.uri ?? metaplex?.uri ?? null);

  const socials = main?.info?.socials ?? [];
  const twitter = socials.find((s) => s.type === "twitter")?.url ?? jup?.twitter ?? null;
  const telegram = socials.find((s) => s.type === "telegram")?.url ?? jup?.telegram ?? null;
  const website = main?.info?.websites?.[0]?.url ?? jup?.website ?? null;

  // 4. Holders.
  const holders = await soft(
    resolveHolders(largest?.value ?? [], supply, new Set(ownPairs.map((p) => p.pairAddress))),
    [] as Holder[],
    warnings,
    "Holder owners",
  );
  const top10 = holders.slice(0, 10);
  const sum = (hs: Holder[]) => hs.reduce((s, h) => s + h.pct, 0);
  const top10Pct = top10.length ? sum(top10) : null;
  const top10PctExLp = holders.length ? sum(holders.filter((h) => !h.tag).slice(0, 10)) : null;

  // 5. Age.
  const pairTimes = ownPairs.map((p) => p.pairCreatedAt).filter((x): x is number => !!x);
  let createdAt: number | null = null;
  let ageSource: TokenReport["age"]["source"] = null;
  let approximate = false;
  if (jup?.firstPool?.createdAt) {
    const t = Date.parse(jup.firstPool.createdAt);
    if (Number.isFinite(t)) [createdAt, ageSource] = [t, "jupiter"];
  }
  if (pairTimes.length) {
    const t = Math.min(...pairTimes);
    if (!createdAt || t < createdAt) [createdAt, ageSource] = [t, "pair"];
  }
  if (!createdAt) {
    const chain = await soft(oldestSignatureTime(address), null, warnings, "Age");
    if (chain) [createdAt, ageSource, approximate] = [chain.time, "chain", chain.approximate];
  }

  // 6. Market.
  const priceUsd = main?.priceUsd ? Number(main.priceUsd) : (jup?.usdPrice ?? null);
  const liquidityUsd = ownPairs.length
    ? ownPairs.reduce((s, p) => s + (p.liquidity?.usd ?? 0), 0)
    : (jup?.liquidity ?? null);

  const report: Omit<TokenReport, "risk"> = {
    version: 1,
    address,
    fetchedAt: Date.now(),
    warnings,
    token: {
      name,
      symbol,
      logo,
      decimals,
      supply,
      program,
      extensions,
      website,
      twitter,
      telegram,
      verified: !!jup?.isVerified,
    },
    authorities: { mint: mint.mintAuthority, freeze: mint.freezeAuthority },
    market: {
      priceUsd,
      marketCap: main?.marketCap ?? jup?.mcap ?? (priceUsd ? priceUsd * supply : null),
      fdv: main?.fdv ?? jup?.fdv ?? null,
      liquidityUsd,
      volume24h: ownPairs.length ? ownPairs.reduce((s, p) => s + (p.volume?.h24 ?? 0), 0) : null,
      priceChange24h: main?.priceChange?.h24 ?? jup?.stats24h?.priceChange ?? null,
      pairs: marketPairs,
      holderCount: jup?.holderCount ?? null,
    },
    age: { createdAt, source: ageSource, approximate },
    holders: { top: holders, top10Pct, top10PctExLp },
  };

  return { ...report, risk: computeRisk(report) };
}

/** Map largest token accounts -> owner wallets and tag LP / program-owned accounts. */
async function resolveHolders(
  accounts: { address: string; uiAmount: number | null; amount: string }[],
  supply: number,
  pairAddresses: Set<string>,
): Promise<Holder[]> {
  if (!accounts.length) return [];
  const tokenAccs = await rpc<RpcValue<(ParsedAccount<{ owner: string }> | null)[]>>("getMultipleAccounts", [
    accounts.map((a) => a.address),
    { encoding: "jsonParsed" },
  ]);
  const owners = tokenAccs.value.map((a) =>
    a && !Array.isArray(a.data) && a.data.parsed ? a.data.parsed.info.owner : null,
  );

  // Owners that are not system-owned wallets are PDAs (pools, bonding curves, vaults).
  const uniqueOwners = [...new Set(owners.filter((o): o is string => !!o))];
  const ownerAccs = uniqueOwners.length
    ? await rpc<RpcValue<({ owner: string } | null)[]>>("getMultipleAccounts", [
        uniqueOwners,
        { encoding: "base64", dataSlice: { offset: 0, length: 0 } },
      ])
    : { value: [] };
  const ownerProgram = new Map(uniqueOwners.map((o, i) => [o, ownerAccs.value[i]?.owner ?? null]));

  return accounts.map((a, i) => {
    const owner = owners[i];
    const amount = a.uiAmount ?? 0;
    let tag: Holder["tag"] = null;
    if (owner && (pairAddresses.has(owner) || KNOWN_LP_OWNERS.has(owner))) tag = "lp";
    else if (owner && ownerProgram.get(owner) && ownerProgram.get(owner) !== SYSTEM_PROGRAM) tag = "program";
    return {
      rank: i + 1,
      account: a.address,
      owner,
      amount,
      pct: supply > 0 ? (amount / supply) * 100 : 0,
      tag,
    };
  });
}

/** Walk back signatures (max 3 pages) to approximate the creation time. */
async function oldestSignatureTime(address: string): Promise<{ time: number; approximate: boolean } | null> {
  let before: string | undefined;
  let last: { blockTime: number | null; signature: string } | undefined;
  for (let page = 0; page < 3; page++) {
    const sigs = await rpc<{ signature: string; blockTime: number | null }[]>("getSignaturesForAddress", [
      address,
      { limit: 1000, ...(before ? { before } : {}) },
    ]);
    if (!sigs.length) break;
    last = sigs[sigs.length - 1];
    before = last.signature;
    if (sigs.length < 1000) return last.blockTime ? { time: last.blockTime * 1000, approximate: false } : null;
  }
  return last?.blockTime ? { time: last.blockTime * 1000, approximate: true } : null;
}
