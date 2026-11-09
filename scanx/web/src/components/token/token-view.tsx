"use client";

import { useEffect } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  BadgeCheck,
  ExternalLink,
  Globe,
  Link2,
  RefreshCw,
  Send,
  Star,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import type { TokenReport } from "@/lib/types";
import { useApi } from "@/lib/client/api";
import { useSaveToken, useTrackWallet } from "@/lib/client/actions";
import { pushHistory } from "@/lib/client/store";
import { usePlan } from "@/lib/client/plan";
import { EXTERNAL } from "@/lib/config";
import { formatAge, formatNumber, formatPct, formatUsd } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, EmptyState, Skeleton } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { CopyButton, Stat, TokenLogo } from "@/components/common";
import { RiskPanel } from "./risk-panel";
import { HoldersTable } from "./holders-table";
import { cn } from "@/lib/utils";

export function TokenView({ address }: { address: string }) {
  const { data, error, loading, reload } = useApi<TokenReport>(`/api/analyze?ca=${address}`);
  const { limits } = usePlan();

  // Record successful analyses in history.
  useEffect(() => {
    if (!data) return;
    pushHistory(
      {
        address: data.address,
        name: data.token.name,
        symbol: data.token.symbol,
        logo: data.token.logo,
        riskScore: data.risk.score,
        riskLevel: data.risk.level,
      },
      limits.history,
    );
  }, [data, limits.history]);

  if (loading && !data) return <ReportSkeleton />;
  if (error) return <ReportError address={address} message={error.message} hint={error.hint} onRetry={reload} />;
  if (!data) return null;
  return <Report r={data} onRefresh={reload} refreshing={loading} />;
}

function Report({ r, onRefresh, refreshing }: { r: TokenReport; onRefresh: () => void; refreshing: boolean }) {
  const { isSaved, toggle } = useSaveToken();
  const saved = isSaved(r.address);
  const change = r.market.priceChange24h;

  const links = [
    { label: "DexScreener", href: EXTERNAL.dexscreener(r.address) },
    { label: "Birdeye", href: EXTERNAL.birdeye(r.address) },
    { label: "GMGN", href: EXTERNAL.gmgn(r.address) },
    { label: "Solscan", href: EXTERNAL.solscanToken(r.address) },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="overflow-hidden">
        <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <TokenLogo src={r.token.logo} symbol={r.token.symbol} className="size-14" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-xl font-semibold sm:text-2xl">{r.token.name ?? "Unknown token"}</h1>
                {r.token.verified && <BadgeCheck className="size-5 text-cyan" aria-label="Verified on Jupiter" />}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span className="font-mono text-sm text-primary">${r.token.symbol ?? "???"}</span>
                <Badge>{r.token.program}</Badge>
                <CopyButton value={r.address} />
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {r.token.twitter && <SocialLink href={r.token.twitter} label="X / Twitter" icon={<XIcon />} />}
            {r.token.telegram && <SocialLink href={r.token.telegram} label="Telegram" icon={<Send />} />}
            {r.token.website && <SocialLink href={r.token.website} label="Website" icon={<Globe />} />}
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                navigator.clipboard?.writeText(window.location.href).then(() => toast.success("Link copied"));
              }}
              title="Copy share link"
            >
              <Link2 />
            </Button>
            <Button variant="outline" size="icon" onClick={onRefresh} disabled={refreshing} title="Refresh">
              <RefreshCw className={cn(refreshing && "animate-spin")} />
            </Button>
            <Button
              variant={saved ? "secondary" : "default"}
              onClick={() => toggle({ address: r.address, name: r.token.name, symbol: r.token.symbol, logo: r.token.logo })}
            >
              <Star className={cn(saved && "fill-primary text-primary")} />
              {saved ? "Watching" : "Watch"}
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-2 border-t border-border sm:grid-cols-4">
          {links.map((l) => (
            <a
              key={l.label}
              href={l.href}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-1.5 border-border px-3 py-2.5 font-mono text-xs uppercase tracking-wider text-muted-foreground transition-colors odd:border-r hover:bg-secondary hover:text-foreground sm:border-r sm:last:border-r-0 [&:nth-child(-n+2)]:border-b sm:[&:nth-child(-n+2)]:border-b-0"
            >
              {l.label} <ExternalLink className="size-3" />
            </a>
          ))}
        </div>
      </Card>

      {/* Market stats */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <Stat
          label="Price"
          value={formatUsd(r.market.priceUsd, { compact: false })}
          sub={change !== null ? `${change >= 0 ? "+" : ""}${formatPct(change)} 24h` : "24h —"}
          tone={change === null ? null : change >= 0 ? "up" : "down"}
        />
        <Stat label="Market cap" value={formatUsd(r.market.marketCap, { compact: true })} sub={`FDV ${formatUsd(r.market.fdv, { compact: true })}`} />
        <Stat
          label="Liquidity"
          value={formatUsd(r.market.liquidityUsd, { compact: true })}
          tone={r.market.liquidityUsd !== null && r.market.liquidityUsd < 10_000 ? "warn" : null}
          sub={`${r.market.pairs.length} pair${r.market.pairs.length === 1 ? "" : "s"}`}
        />
        <Stat label="Volume 24h" value={formatUsd(r.market.volume24h, { compact: true })} />
        <Stat
          label="Age"
          value={`${r.age.approximate ? "≥ " : ""}${formatAge(r.age.createdAt)}`}
          sub={r.age.createdAt ? new Date(r.age.createdAt).toLocaleDateString() : undefined}
        />
        <Stat label="Holders" value={formatNumber(r.market.holderCount, 0)} sub={`Supply ${formatNumber(r.token.supply, 0)}`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]">
        <div className="space-y-4">
          <RiskPanel risk={r.risk} />
          <AuthoritiesCard r={r} />
        </div>
        <div className="space-y-4">
          <HoldersTable holders={r.holders} />
          <PairsCard pairs={r.market.pairs} />
        </div>
      </div>

      {r.warnings.length > 0 && (
        <p className="flex items-start gap-2 text-xs text-muted-foreground">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-warning" />
          Some sources were unavailable: {r.warnings.join(" · ")}
        </p>
      )}
      <p className="hud-label">Updated {new Date(r.fetchedAt).toLocaleTimeString()}</p>
    </div>
  );
}

function AuthoritiesCard({ r }: { r: TokenReport }) {
  const rows = [
    { label: "Mint authority", value: r.authorities.mint },
    { label: "Freeze authority", value: r.authorities.freeze },
  ];
  return (
    <Card>
      <CardHeader>
        <CardTitle>Authorities & program</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2.5">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-3">
            <span className="text-sm text-muted-foreground">{row.label}</span>
            {row.value ? (
              <span className="flex items-center gap-1.5">
                <Badge variant="danger">Active</Badge>
                <CopyButton value={row.value} label={`${row.value.slice(0, 4)}…`} />
              </span>
            ) : (
              <Badge variant="success">Revoked</Badge>
            )}
          </div>
        ))}
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-muted-foreground">Decimals</span>
          <span className="num text-sm">{r.token.decimals ?? "—"}</span>
        </div>
        {r.token.extensions.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {r.token.extensions.map((e) => (
              <Badge key={e} variant="accent">
                {e}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PairsCard({ pairs }: { pairs: TokenReport["market"]["pairs"] }) {
  if (!pairs.length) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Liquidity pools</CardTitle>
        <span className="hud-label">{pairs.length} shown</span>
      </CardHeader>
      <ul className="divide-y divide-border">
        {pairs.map((p) => (
          <li key={p.pairAddress}>
            <a href={p.url} target="_blank" rel="noreferrer" className="flex items-center gap-3 px-4 py-2.5 hover:bg-secondary/50">
              <Badge variant="cyan" className="min-w-16 justify-center">
                {p.dex}
              </Badge>
              <span className="num flex-1 truncate text-xs text-muted-foreground">{p.pairAddress.slice(0, 8)}…</span>
              <span className="num w-20 text-right text-sm">{formatUsd(p.liquidityUsd, { compact: true })}</span>
              <span className="num hidden w-20 text-right text-xs text-muted-foreground sm:block">
                vol {formatUsd(p.volume24h, { compact: true })}
              </span>
            </a>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function SocialLink({ href, label, icon }: { href: string; label: string; icon: React.ReactNode }) {
  return (
    <Button asChild variant="outline" size="icon" title={label}>
      <a href={href} target="_blank" rel="noreferrer">
        {icon}
      </a>
    </Button>
  );
}

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function ReportSkeleton() {
  return (
    <div className="space-y-4" aria-busy>
      <Card className="relative overflow-hidden p-4">
        <div className="absolute inset-x-0 top-0 h-px overflow-hidden">
          <div className="scan-line h-px w-1/4 bg-gradient-to-r from-transparent via-primary to-transparent" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="size-14 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
      </Card>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-[74px]" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-[1fr_1.35fr]">
        <Skeleton className="h-96" />
        <Skeleton className="h-96" />
      </div>
      <p className="hud-label text-center">Scanning chain · authorities · holders · liquidity…</p>
    </div>
  );
}

function ReportError({
  address,
  message,
  hint,
  onRetry,
}: {
  address: string;
  message: string;
  hint?: string;
  onRetry: () => void;
}) {
  const { track, isTracked } = useTrackWallet();
  return (
    <Card>
      <EmptyState icon={hint === "wallet" ? <Wallet /> : <AlertTriangle />} title={message}>
        <p className="break-all font-mono text-xs">{address}</p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {hint === "wallet" ? (
            <>
              <Button asChild variant="secondary">
                <Link href={`/tracker?w=${address}`}>Open wallet</Link>
              </Button>
              {!isTracked(address) && <Button onClick={() => track(address)}>Track wallet</Button>}
            </>
          ) : (
            <>
              <Button variant="secondary" onClick={onRetry}>
                <RefreshCw /> Retry
              </Button>
              <Button asChild variant="outline">
                <Link href="/">New search</Link>
              </Button>
            </>
          )}
        </div>
      </EmptyState>
    </Card>
  );
}
