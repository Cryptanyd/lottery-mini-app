export function formatUsd(n: number | null | undefined, opts: { compact?: boolean } = {}) {
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  const compact = opts.compact ?? Math.abs(n) >= 10_000;
  if (!compact && Math.abs(n) < 1 && n !== 0) return `$${formatSmall(n)}`;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: compact ? "compact" : "standard",
    maximumFractionDigits: 2,
  }).format(n);
}

/** Small prices: use significant digits so memecoin prices stay readable. */
export function formatSmall(n: number) {
  if (n === 0) return "0";
  if (Math.abs(n) >= 0.01) return n.toFixed(4);
  return n.toPrecision(3);
}

export function formatNumber(n: number | null | undefined, digits = 2) {
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("en-US", {
    notation: Math.abs(n) >= 100_000 ? "compact" : "standard",
    maximumFractionDigits: digits,
  }).format(n);
}

export function formatPct(n: number | null | undefined, digits = 2) {
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  return `${n.toFixed(digits)}%`;
}

export function formatAge(fromMs: number | null | undefined, now = Date.now()) {
  if (!fromMs) return "—";
  const s = Math.max(0, Math.floor((now - fromMs) / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h}h ${m % 60}m`;
  const d = Math.floor(h / 24);
  if (d < 60) return `${d}d`;
  const mo = Math.floor(d / 30);
  if (mo < 24) return `${mo}mo`;
  return `${(d / 365).toFixed(1)}y`;
}

export function timeAgo(ms: number | null | undefined) {
  if (!ms) return "—";
  return `${formatAge(ms)} ago`;
}
