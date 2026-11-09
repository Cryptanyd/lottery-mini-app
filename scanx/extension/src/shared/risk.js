/**
 * Transparent, rule-based risk score (0 = safest, 100 = riskiest).
 * Same rules as the website (scanx/web/src/lib/risk.ts) — keep them in sync.
 */
(() => {
  const DANGEROUS_EXTENSIONS = {
    permanentDelegate: "Permanent delegate can move or burn anyone's tokens",
    transferHook: "Transfer hook runs custom code on every transfer",
    transferFeeConfig: "Transfer fee (tax) on every transfer",
    defaultAccountState: "New accounts may start frozen",
    nonTransferable: "Token cannot be transferred",
    pausableConfig: "Transfers can be paused",
  };

  const pct = (n) => `${n.toFixed(1)}%`;
  const usd = (n) =>
    n >= 1e9 ? `$${(n / 1e9).toFixed(2)}B` : n >= 1e6 ? `$${(n / 1e6).toFixed(2)}M` : n >= 1e3 ? `$${(n / 1e3).toFixed(1)}K` : `$${n.toFixed(0)}`;

  function age(ms) {
    const h = (Date.now() - ms) / 3_600_000;
    if (h < 1) return `${Math.max(1, Math.round(h * 60))}m`;
    if (h < 48) return `${Math.floor(h)}h`;
    const d = Math.floor(h / 24);
    return d < 60 ? `${d}d` : d < 730 ? `${Math.floor(d / 30)}mo` : `${(d / 365).toFixed(1)}y`;
  }

  /**
   * @param {object} r  { authorities:{mint,freeze}, holders:{top10Pct, topWalletPct}, market:{liquidityUsd, pairs}, age:{createdAt}, token:{extensions} }
   *   Unknown values are `undefined` (not checked) — they add no points and show as "unknown".
   */
  function computeRisk(r) {
    const f = [];
    const add = (x) => f.push(x);

    // 1. Mint authority
    if (r.authorities.mint === undefined) add({ id: "mint", label: "Mint authority", detail: "Unknown", status: "info", points: 0 });
    else if (r.authorities.mint) add({ id: "mint", label: "Mint authority", detail: "Active — supply can be inflated", status: "danger", points: 30 });
    else add({ id: "mint", label: "Mint authority", detail: "Revoked", status: "ok", points: 0 });

    // 2. Freeze authority
    if (r.authorities.freeze === undefined) add({ id: "freeze", label: "Freeze authority", detail: "Unknown", status: "info", points: 0 });
    else if (r.authorities.freeze) add({ id: "freeze", label: "Freeze authority", detail: "Active — wallets can be frozen", status: "danger", points: 20 });
    else add({ id: "freeze", label: "Freeze authority", detail: "Revoked", status: "ok", points: 0 });

    // 3. Holder concentration
    const c = r.holders.top10Pct;
    if (c === undefined || c === null) add({ id: "top10", label: "Top-10 holders", detail: "Unknown", status: "info", points: 0 });
    else if (c > 50) add({ id: "top10", label: "Top-10 holders", detail: `${pct(c)} of supply`, status: "danger", points: 20 });
    else if (c > 30) add({ id: "top10", label: "Top-10 holders", detail: `${pct(c)} of supply`, status: "warn", points: 10 });
    else add({ id: "top10", label: "Top-10 holders", detail: `${pct(c)} of supply`, status: "ok", points: 0 });

    // 4. Single whale
    const w = r.holders.topWalletPct;
    if (w !== undefined && w !== null) {
      add({
        id: "whale",
        label: "Largest wallet",
        detail: `${pct(w)} of supply`,
        status: w > 20 ? "danger" : w > 10 ? "warn" : "ok",
        points: w > 20 ? 10 : w > 10 ? 5 : 0,
      });
    }

    // 5. Liquidity
    const liq = r.market.liquidityUsd;
    if (!r.market.pairs && (liq === null || liq === undefined)) add({ id: "liq", label: "Liquidity", detail: "No DEX pairs found", status: "danger", points: 15 });
    else if (liq !== null && liq !== undefined && liq < 10_000) add({ id: "liq", label: "Liquidity", detail: `${usd(liq)} — thin, high slippage`, status: "warn", points: 10 });
    else if (liq !== null && liq !== undefined) add({ id: "liq", label: "Liquidity", detail: usd(liq), status: "ok", points: 0 });

    // 6. Age
    if (r.age.createdAt) {
      const young = Date.now() - r.age.createdAt < 86_400_000;
      add({ id: "age", label: "Token age", detail: age(r.age.createdAt), status: young ? "warn" : "ok", points: young ? 10 : 0 });
    }

    // 7. Token-2022 extensions
    const bad = (r.token.extensions || []).filter((e) => e in DANGEROUS_EXTENSIONS);
    if (bad.length) {
      add({ id: "ext", label: "Token-2022 extensions", detail: bad.map((e) => DANGEROUS_EXTENSIONS[e]).join("; "), status: "danger", points: 15 });
    }

    const score = Math.min(100, f.reduce((s, x) => s + x.points, 0));
    const level = score >= 55 ? "high" : score >= 25 ? "medium" : "low";
    return { score, level, factors: f };
  }

  globalThis.SCANX = globalThis.SCANX || {};
  globalThis.SCANX.risk = { computeRisk, formatAge: age, formatUsd: usd };
})();
