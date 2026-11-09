"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CheckCircle2, ExternalLink, Pencil, Plus, RefreshCw, Trash2, XCircle } from "lucide-react";
import { toast } from "sonner";
import type { WalletReport } from "@/lib/types";
import { useApi } from "@/lib/client/api";
import { useTrackWallet } from "@/lib/client/actions";
import { WALLET_TAGS, walletsStore } from "@/lib/client/store";
import { EXTERNAL } from "@/lib/config";
import { formatNumber, formatUsd, timeAgo } from "@/lib/format";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState, Input, Skeleton } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { CopyButton, Stat, TokenLogo } from "@/components/common";
import { TagChip } from "./tag-chip";
import { cn } from "@/lib/utils";

export function WalletDetail({ address, onRemoved }: { address: string; onRemoved: () => void }) {
  const { data, error, loading, reload } = useApi<WalletReport>(`/api/wallet?address=${address}`);
  const { wallets, track } = useTrackWallet();
  const entry = wallets.find((w) => w.address === address);
  const ref = useRef<HTMLDivElement>(null);
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(entry?.label ?? "");

  // On mobile, bring the detail panel into view when a wallet is picked.
  useEffect(() => {
    if (!window.matchMedia("(min-width: 1024px)").matches) ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [address]);

  const update = (patch: Partial<NonNullable<typeof entry>>) =>
    walletsStore.set((p) => p.map((w) => (w.address === address ? { ...w, ...patch } : w)));

  return (
    <div ref={ref} className="scroll-mt-20 space-y-4">
      <Card>
        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start">
          <div className="min-w-0 flex-1">
            {editing && entry ? (
              <form
                className="flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  update({ label: label.trim() });
                  setEditing(false);
                }}
              >
                <Input value={label} onChange={(e) => setLabel(e.target.value)} autoFocus maxLength={40} />
                <Button type="submit" size="sm">
                  Save
                </Button>
              </form>
            ) : (
              <div className="flex items-center gap-2">
                <h2 className="truncate text-xl font-semibold">{entry?.label || "Wallet"}</h2>
                {entry && (
                  <button onClick={() => setEditing(true)} className="text-muted-foreground hover:text-foreground" title="Rename">
                    <Pencil className="size-3.5" />
                  </button>
                )}
              </div>
            )}
            <CopyButton value={address} className="mt-1 px-0" />
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { l: "GMGN", h: EXTERNAL.gmgnWallet(address) },
              { l: "Birdeye", h: EXTERNAL.birdeyeWallet(address) },
              { l: "Solscan", h: EXTERNAL.solscanAccount(address) },
            ].map((x) => (
              <Button key={x.l} asChild variant="outline" size="sm" className="font-mono text-[0.68rem] uppercase">
                <a href={x.h} target="_blank" rel="noreferrer">
                  {x.l} <ExternalLink className="size-3" />
                </a>
              </Button>
            ))}
            <Button variant="outline" size="icon-sm" onClick={reload} disabled={loading} title="Refresh">
              <RefreshCw className={cn(loading && "animate-spin")} />
            </Button>
            {entry ? (
              <Button
                variant="destructive"
                size="icon-sm"
                title="Stop tracking"
                onClick={() => {
                  walletsStore.set((p) => p.filter((w) => w.address !== address));
                  toast("Wallet removed");
                  onRemoved();
                }}
              >
                <Trash2 />
              </Button>
            ) : (
              <Button size="sm" onClick={() => track(address)}>
                <Plus /> Track
              </Button>
            )}
          </div>
        </div>
        {entry && (
          <div className="flex flex-wrap gap-1 border-t border-border px-4 py-2.5">
            {WALLET_TAGS.map((t) => (
              <TagChip
                key={t}
                tag={t}
                active={entry.tags.includes(t)}
                onClick={() => update({ tags: entry.tags.includes(t) ? entry.tags.filter((x) => x !== t) : [...entry.tags, t] })}
              />
            ))}
          </div>
        )}
      </Card>

      {error ? (
        <Card>
          <EmptyState icon={<XCircle />} title={error.message}>
            <Button variant="secondary" className="mt-3" onClick={reload}>
              <RefreshCw /> Retry
            </Button>
          </EmptyState>
        </Card>
      ) : !data ? (
        <>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-[74px]" />
            ))}
          </div>
          <Skeleton className="h-72" />
        </>
      ) : (
        <WalletData r={data} />
      )}
    </div>
  );
}

function WalletData({ r }: { r: WalletReport }) {
  return (
    <>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Net worth" value={formatUsd(r.totalValueUsd, { compact: true })} />
        <Stat label="SOL" value={formatNumber(r.solBalance, 3)} sub={formatUsd(r.solValueUsd)} />
        <Stat label="Tokens value" value={formatUsd(r.tokensValueUsd, { compact: true })} />
        <Stat label="Token accounts" value={formatNumber(r.tokenCount, 0)} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top tokens</CardTitle>
            <span className="hud-label">by value</span>
          </CardHeader>
          {!r.tokens.length ? (
            <EmptyState title="No tokens" />
          ) : (
            <ul className="max-h-[480px] divide-y divide-border overflow-y-auto">
              {r.tokens.slice(0, 25).map((t) => (
                <li key={t.mint}>
                  <Link href={`/ca/${t.mint}`} className="flex items-center gap-3 px-4 py-2 hover:bg-secondary/50">
                    <TokenLogo src={t.logo} symbol={t.symbol} className="size-7 text-[0.55rem]" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm">{t.symbol ? `$${t.symbol}` : `${t.mint.slice(0, 6)}…`}</div>
                      <div className="num truncate text-xs text-muted-foreground">{formatNumber(t.amount)}</div>
                    </div>
                    <span className="num text-sm">{formatUsd(t.valueUsd)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent transactions</CardTitle>
            <span className="hud-label">last {r.transactions.length}</span>
          </CardHeader>
          {!r.transactions.length ? (
            <EmptyState title="No recent transactions" />
          ) : (
            <ul className="max-h-[480px] divide-y divide-border overflow-y-auto">
              {r.transactions.map((tx) => (
                <li key={tx.signature}>
                  <a
                    href={EXTERNAL.solscanTx(tx.signature)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-3 px-4 py-2 hover:bg-secondary/50"
                  >
                    {tx.ok ? (
                      <CheckCircle2 className="size-4 shrink-0 text-success" />
                    ) : (
                      <XCircle className="size-4 shrink-0 text-destructive" />
                    )}
                    <span className="num min-w-0 flex-1 truncate text-xs">{tx.signature}</span>
                    <span className="num shrink-0 text-xs text-muted-foreground">{timeAgo(tx.blockTime)}</span>
                    <ExternalLink className="size-3 shrink-0 text-muted-foreground" />
                  </a>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
      {r.warnings.length > 0 && <p className="text-xs text-muted-foreground">Partial data: {r.warnings.join(" · ")}</p>}
    </>
  );
}
