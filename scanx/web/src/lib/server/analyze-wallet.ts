import type { WalletReport, WalletToken } from "@/lib/types";
import { soft } from "./http";
import { rpc, TOKEN_2022_PROGRAM, TOKEN_PROGRAM, WSOL_MINT, type ParsedAccount, type RpcValue } from "./rpc";
import { jupPrices, jupTokens } from "./sources";

interface TokenAccountInfo {
  mint: string;
  tokenAmount: { uiAmount: number | null; decimals: number; amount: string };
}

type TokenAccountsResult = RpcValue<{ pubkey: string; account: ParsedAccount<TokenAccountInfo> }[]>;

export async function analyzeWallet(address: string): Promise<WalletReport> {
  const warnings: string[] = [];

  const [balance, spl, t22, sigs] = await Promise.all([
    rpc<RpcValue<number>>("getBalance", [address]),
    soft(
      rpc<TokenAccountsResult>("getTokenAccountsByOwner", [address, { programId: TOKEN_PROGRAM }, { encoding: "jsonParsed" }]),
      { context: { slot: 0 }, value: [] },
      warnings,
      "SPL tokens",
    ),
    soft(
      rpc<TokenAccountsResult>("getTokenAccountsByOwner", [address, { programId: TOKEN_2022_PROGRAM }, { encoding: "jsonParsed" }]),
      { context: { slot: 0 }, value: [] },
      warnings,
      "Token-2022",
    ),
    soft(
      rpc<{ signature: string; blockTime: number | null; err: unknown; memo: string | null }[]>(
        "getSignaturesForAddress",
        [address, { limit: 20 }],
      ),
      [],
      warnings,
      "Transactions",
    ),
  ]);

  // Aggregate non-zero balances per mint.
  const byMint = new Map<string, { amount: number; decimals: number }>();
  for (const { account } of [...spl.value, ...t22.value]) {
    if (Array.isArray(account.data) || !account.data.parsed) continue;
    const info = account.data.parsed.info;
    const amt = info.tokenAmount.uiAmount ?? 0;
    if (amt <= 0) continue;
    const prev = byMint.get(info.mint);
    byMint.set(info.mint, { amount: (prev?.amount ?? 0) + amt, decimals: info.tokenAmount.decimals });
  }

  // Price everything (cap to 100 mints to stay polite to free APIs).
  const mints = [...byMint.keys()].slice(0, 100);
  const [prices, metas] = await Promise.all([
    soft(jupPrices([WSOL_MINT, ...mints]), {} as Record<string, number>, warnings, "Prices"),
    soft(jupTokens(mints), [], warnings, "Token metadata"),
  ]);
  const metaByMint = new Map(metas.map((m) => [m.id, m]));

  const tokens: WalletToken[] = mints.map((mint) => {
    const { amount, decimals } = byMint.get(mint)!;
    const meta = metaByMint.get(mint);
    const priceUsd = prices[mint] ?? meta?.usdPrice ?? null;
    return {
      mint,
      amount,
      decimals,
      symbol: meta?.symbol ?? null,
      name: meta?.name ?? null,
      logo: meta?.icon ?? null,
      priceUsd,
      valueUsd: priceUsd !== null ? priceUsd * amount : null,
    };
  });
  tokens.sort((a, b) => (b.valueUsd ?? -1) - (a.valueUsd ?? -1));

  const solBalance = balance.value / 1e9;
  const solPriceUsd = prices[WSOL_MINT] ?? null;
  const solValueUsd = solPriceUsd !== null ? solBalance * solPriceUsd : null;
  const priced = tokens.filter((t) => t.valueUsd !== null);
  // null (unknown) rather than $0 when the price source is down.
  const tokensValueUsd = tokens.length && !priced.length ? null : priced.reduce((s, t) => s + (t.valueUsd ?? 0), 0);

  return {
    version: 1,
    address,
    fetchedAt: Date.now(),
    warnings,
    solBalance,
    solPriceUsd,
    solValueUsd,
    tokensValueUsd,
    totalValueUsd: solValueUsd !== null ? solValueUsd + (tokensValueUsd ?? 0) : null,
    tokenCount: byMint.size,
    tokens: tokens.slice(0, 50),
    transactions: sigs.map((s) => ({
      signature: s.signature,
      blockTime: s.blockTime ? s.blockTime * 1000 : null,
      ok: !s.err,
      memo: s.memo,
    })),
  };
}
