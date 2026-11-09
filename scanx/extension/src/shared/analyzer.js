/**
 * Standalone token analysis for the extension — no ScanX server required.
 * Sources (free, key-less):
 *   - Solana JSON-RPC        mint/freeze authority, supply, largest holders
 *   - DexScreener            price, liquidity, volume, mcap, pair age, logo, socials
 *   - Jupiter lite-api       name/symbol/logo fallback, holder count, audit fallback
 * Every source is optional: the card renders with whatever succeeded.
 *
 * Runs in the background service worker (host_permissions → no CORS issues).
 * `analyzeToken(address, { fetch, rpcUrl })` — fetch is injectable for tests.
 */
(() => {
  const TOKEN_PROGRAM = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
  const TOKEN_2022_PROGRAM = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";
  const SYSTEM_PROGRAM = "11111111111111111111111111111111";
  const DEFAULT_RPC = "https://api.mainnet-beta.solana.com";

  /** Well-known AMM authorities that own pool vaults. */
  const KNOWN_LP_OWNERS = new Set([
    "5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1", // Raydium AMM v4
    "GpMZbSM2GgvTKHJirzeGfMFoaZ8UR2X7F4v8vHTvxFbL", // Raydium CPMM
    "WLHv2UAZm6z4KyaaELi5pjdbJh6RESMva1Rnn8pJVVh", // Meteora DAMM v2
  ]);

  function withTimeout(fetchFn, url, init = {}, ms = 8000) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), ms);
    return fetchFn(url, { ...init, signal: ctrl.signal }).finally(() => clearTimeout(t));
  }

  async function getJson(fetchFn, url, init) {
    const res = await withTimeout(fetchFn, url, init);
    if (!res.ok) throw new Error(`${new URL(url).host} ${res.status}`);
    return res.json();
  }

  function makeRpc(fetchFn, rpcUrl) {
    let id = 0;
    return async (method, params) => {
      const json = await getJson(fetchFn, rpcUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: ++id, method, params }),
      });
      if (json.error) throw new Error(`RPC ${json.error.message || json.error.code}`);
      return json.result;
    };
  }

  const soft = (p, warnings, label) =>
    p.catch((e) => {
      warnings.push(`${label}: ${e && e.message ? e.message : "failed"}`);
      return null;
    });

  async function analyzeToken(address, { fetch: fetchFn = fetch, rpcUrl = DEFAULT_RPC } = {}) {
    const warnings = [];
    const rpc = makeRpc(fetchFn, rpcUrl);

    const [acc, dexRaw, jupRaw, largest] = await Promise.all([
      soft(rpc("getAccountInfo", [address, { encoding: "jsonParsed" }]), warnings, "RPC"),
      soft(getJson(fetchFn, `https://api.dexscreener.com/tokens/v1/solana/${address}`), warnings, "DexScreener"),
      soft(getJson(fetchFn, `https://lite-api.jup.ag/tokens/v2/search?query=${address}`), warnings, "Jupiter"),
      soft(rpc("getTokenLargestAccounts", [address]), warnings, "Holders"),
    ]);

    // ---- What kind of account is this? ----
    const value = acc && acc.value;
    const parsed = value && !Array.isArray(value.data) ? value.data.parsed : null;
    const isMint = !!value && (value.owner === TOKEN_PROGRAM || value.owner === TOKEN_2022_PROGRAM) && parsed && parsed.type === "mint";
    if (value && !isMint) {
      return {
        kind: value.owner === SYSTEM_PROGRAM ? "wallet" : "other",
        address,
        warnings,
        solBalance: value.owner === SYSTEM_PROGRAM ? value.lamports / 1e9 : null,
      };
    }

    const pairsAll = Array.isArray(dexRaw) ? dexRaw : (dexRaw && dexRaw.pairs) || [];
    const pairs = pairsAll
      .filter((p) => p.chainId === "solana" && (p.baseToken?.address === address || p.quoteToken?.address === address))
      .sort((a, b) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0));
    const main = pairs.find((p) => p.baseToken?.address === address) || pairs[0];
    const jup = Array.isArray(jupRaw) ? jupRaw.find((t) => t.id === address) || null : null;

    if (!value && !main && !jup) {
      // RPC failed or account missing, and no market data either.
      return { kind: acc ? "not_found" : "unknown", address, warnings };
    }

    // ---- Token basics ----
    const info = isMint ? parsed.info : null;
    const decimals = info ? info.decimals : (jup && jup.decimals) ?? null;
    const supply = info ? Number(info.supply) / 10 ** info.decimals : null;
    const extensions = info && info.extensions ? info.extensions.map((e) => e.extension) : [];
    const meta2022 = info && info.extensions ? info.extensions.find((e) => e.extension === "tokenMetadata") : null;

    const token = {
      name: main?.baseToken?.name || jup?.name || meta2022?.state?.name || null,
      symbol: main?.baseToken?.symbol || jup?.symbol || meta2022?.state?.symbol || null,
      logo: main?.info?.imageUrl || jup?.icon || null,
      decimals,
      supply,
      program: value ? (value.owner === TOKEN_2022_PROGRAM ? "token-2022" : "spl-token") : null,
      extensions,
      verified: !!jup?.isVerified,
      twitter: main?.info?.socials?.find((s) => s.type === "twitter")?.url || jup?.twitter || null,
      website: main?.info?.websites?.[0]?.url || jup?.website || null,
    };

    // ---- Authorities: RPC first, Jupiter audit as fallback ----
    let authorities;
    if (info) authorities = { mint: info.mintAuthority || null, freeze: info.freezeAuthority || null };
    else if (jup?.audit) {
      authorities = {
        mint: jup.audit.mintAuthorityDisabled === undefined ? undefined : jup.audit.mintAuthorityDisabled ? null : "active",
        freeze: jup.audit.freezeAuthorityDisabled === undefined ? undefined : jup.audit.freezeAuthorityDisabled ? null : "active",
      };
    } else authorities = { mint: undefined, freeze: undefined };

    // ---- Holders ----
    let holders = { top10Pct: jup?.audit?.topHoldersPercentage ?? undefined, topWalletPct: undefined, top: [], excludedLp: false };
    const accounts = largest?.value || [];
    if (accounts.length && supply) {
      const pairAddrs = new Set(pairs.map((p) => p.pairAddress));
      const owners = await soft(
        rpc("getMultipleAccounts", [accounts.map((a) => a.address), { encoding: "jsonParsed" }]),
        warnings,
        "Holder owners",
      );
      const ownerOf = (i) => {
        const a = owners?.value?.[i];
        return a && !Array.isArray(a.data) ? a.data?.parsed?.info?.owner || null : null;
      };
      const list = accounts.map((a, i) => {
        const owner = ownerOf(i);
        const lp = !!owner && (pairAddrs.has(owner) || KNOWN_LP_OWNERS.has(owner));
        return { owner: owner || a.address, pct: ((a.uiAmount || 0) / supply) * 100, lp };
      });
      const wallets = list.filter((h) => !h.lp);
      holders = {
        top10Pct: wallets.slice(0, 10).reduce((s, h) => s + h.pct, 0),
        topWalletPct: wallets[0]?.pct ?? undefined,
        top: list.slice(0, 10),
        excludedLp: list.some((h) => h.lp),
      };
    }

    // ---- Market ----
    const priceUsd = main?.priceUsd ? Number(main.priceUsd) : jup?.usdPrice ?? null;
    const market = {
      priceUsd,
      priceChange24h: main?.priceChange?.h24 ?? jup?.stats24h?.priceChange ?? null,
      marketCap: main?.marketCap ?? jup?.mcap ?? (priceUsd && supply ? priceUsd * supply : null),
      liquidityUsd: pairs.length ? pairs.reduce((s, p) => s + (p.liquidity?.usd || 0), 0) : jup?.liquidity ?? null,
      volume24h: pairs.length ? pairs.reduce((s, p) => s + (p.volume?.h24 || 0), 0) : null,
      holderCount: jup?.holderCount ?? null,
      pairs: pairs.length,
      dex: main?.dexId || null,
    };

    // ---- Age ----
    const times = pairs.map((p) => p.pairCreatedAt).filter(Boolean);
    const jupTime = jup?.firstPool?.createdAt ? Date.parse(jup.firstPool.createdAt) : NaN;
    if (Number.isFinite(jupTime)) times.push(jupTime);
    const createdAt = times.length ? Math.min(...times) : null;

    const report = { kind: "token", address, fetchedAt: Date.now(), warnings, token, authorities, holders, market, age: { createdAt } };
    report.risk = globalThis.SCANX.risk.computeRisk(report);
    return report;
  }

  globalThis.SCANX = globalThis.SCANX || {};
  globalThis.SCANX.analyzer = { analyzeToken, DEFAULT_RPC };
})();
