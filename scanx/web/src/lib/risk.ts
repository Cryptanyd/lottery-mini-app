import type { RiskFactor, RiskLevel, TokenReport } from "./types";
import { formatPct, formatUsd, formatAge } from "./format";

/**
 * Transparent, rule-based risk score (0 = safest, 100 = riskiest).
 * Every point is explained by a factor so users can see *why*.
 * Pure function — shared by API, UI and (later) the extension quick-card.
 */
type RiskInput = Pick<TokenReport, "authorities" | "market" | "holders" | "age" | "token">;

const DANGEROUS_EXTENSIONS: Record<string, string> = {
  permanentDelegate: "Permanent delegate can move or burn anyone's tokens",
  transferHook: "Transfer hook runs custom code on every transfer",
  transferFeeConfig: "Transfer fee (tax) on every transfer",
  defaultAccountState: "New accounts may start frozen",
  nonTransferable: "Token cannot be transferred",
  pausableConfig: "Transfers can be paused",
};

export function computeRisk(r: RiskInput): { score: number; level: RiskLevel; factors: RiskFactor[] } {
  const f: RiskFactor[] = [];
  const add = (x: RiskFactor) => f.push(x);

  // 1. Mint authority — can print unlimited supply.
  add(
    r.authorities.mint
      ? { id: "mint", label: "Mint authority", detail: "Active — supply can be inflated", status: "danger", points: 30 }
      : { id: "mint", label: "Mint authority", detail: "Revoked", status: "ok", points: 0 },
  );

  // 2. Freeze authority — can freeze holders (honeypot vector).
  add(
    r.authorities.freeze
      ? { id: "freeze", label: "Freeze authority", detail: "Active — wallets can be frozen", status: "danger", points: 20 }
      : { id: "freeze", label: "Freeze authority", detail: "Revoked", status: "ok", points: 0 },
  );

  // 3. Holder concentration (excluding detected LP / bonding curve).
  const conc = r.holders.top10PctExLp ?? r.holders.top10Pct;
  if (conc === null) {
    add({ id: "top10", label: "Top-10 holders", detail: "Unavailable", status: "info", points: 0 });
  } else if (conc > 50) {
    add({ id: "top10", label: "Top-10 holders", detail: `${formatPct(conc, 1)} of supply (ex-LP)`, status: "danger", points: 20 });
  } else if (conc > 30) {
    add({ id: "top10", label: "Top-10 holders", detail: `${formatPct(conc, 1)} of supply (ex-LP)`, status: "warn", points: 10 });
  } else {
    add({ id: "top10", label: "Top-10 holders", detail: `${formatPct(conc, 1)} of supply (ex-LP)`, status: "ok", points: 0 });
  }

  // 4. Single whale.
  const topWallet = r.holders.top.find((h) => !h.tag);
  if (topWallet) {
    const p = topWallet.pct;
    add({
      id: "whale",
      label: "Largest wallet",
      detail: `${formatPct(p, 1)} of supply`,
      status: p > 20 ? "danger" : p > 10 ? "warn" : "ok",
      points: p > 20 ? 10 : p > 10 ? 5 : 0,
    });
  }

  // 5. Liquidity.
  const liq = r.market.liquidityUsd;
  if (!r.market.pairs.length && liq === null) {
    add({ id: "liq", label: "Liquidity", detail: "No DEX pairs found", status: "danger", points: 15 });
  } else if (liq !== null && liq < 10_000) {
    add({ id: "liq", label: "Liquidity", detail: `${formatUsd(liq)} — thin, high slippage`, status: "warn", points: 10 });
  } else {
    add({ id: "liq", label: "Liquidity", detail: formatUsd(liq), status: "ok", points: 0 });
  }

  // 6. Age.
  const created = r.age.createdAt;
  if (created) {
    const hours = (Date.now() - created) / 3_600_000;
    add({
      id: "age",
      label: "Token age",
      detail: `${r.age.approximate ? "≥ " : ""}${formatAge(created)}`,
      status: hours < 24 ? "warn" : "ok",
      points: hours < 24 ? 10 : 0,
    });
  } else {
    add({ id: "age", label: "Token age", detail: "Unknown", status: "info", points: 0 });
  }

  // 7. Token-2022 extensions.
  const bad = r.token.extensions.filter((e) => e in DANGEROUS_EXTENSIONS);
  if (bad.length) {
    add({
      id: "ext",
      label: "Token-2022 extensions",
      detail: bad.map((e) => DANGEROUS_EXTENSIONS[e]).join("; "),
      status: "danger",
      points: 15,
    });
  }

  const score = Math.min(100, f.reduce((s, x) => s + x.points, 0));
  const level: RiskLevel = score >= 55 ? "high" : score >= 25 ? "medium" : "low";
  return { score, level, factors: f };
}
