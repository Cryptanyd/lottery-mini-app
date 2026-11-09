"use client";

import Link from "next/link";
import { ExternalLink, Plus, Radar } from "lucide-react";
import type { TokenReport } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, EmptyState } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/common";
import { EXTERNAL } from "@/lib/config";
import { formatNumber, formatPct } from "@/lib/format";
import { useTrackWallet } from "@/lib/client/actions";

const PALETTE = ["#f5b73b", "#8b7bff", "#4fd1c5", "#5b8def", "#e879f9", "#3ddc97", "#f97362", "#a3e635", "#38bdf8", "#fb923c"];

export function HoldersTable({ holders }: { holders: TokenReport["holders"] }) {
  const { isTracked, track } = useTrackWallet();
  const top = holders.top.slice(0, 10);
  const max = Math.max(...top.map((h) => h.pct), 1);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top 10 holders</CardTitle>
        <div className="flex gap-3">
          <span className="hud-label">
            all <span className="num text-foreground">{formatPct(holders.top10Pct, 1)}</span>
          </span>
          <span className="hud-label">
            ex-LP <span className="num text-primary">{formatPct(holders.top10PctExLp, 1)}</span>
          </span>
        </div>
      </CardHeader>

      {!top.length ? (
        <EmptyState icon={<Radar />} title="Holder data unavailable">
          The RPC didn&apos;t return largest accounts (often rate-limited on public endpoints). Try refresh.
        </EmptyState>
      ) : (
        <>
          {/* Stacked distribution bar */}
          <div className="px-4 pt-4">
            <div className="flex h-2 overflow-hidden rounded-full bg-secondary">
              {top.map((h, i) => (
                <div
                  key={h.account}
                  title={`#${h.rank} ${formatPct(h.pct)}`}
                  style={{ width: `${Math.min(h.pct, 100)}%`, background: h.tag ? "#334155" : PALETTE[i % PALETTE.length] }}
                />
              ))}
            </div>
          </div>
          <CardContent className="p-0 pt-2">
            <ul className="divide-y divide-border">
              {top.map((h, i) => (
                <li key={h.account} className="flex items-center gap-3 px-4 py-2">
                  <span className="num w-5 shrink-0 text-xs text-muted-foreground">{h.rank}</span>
                  <span className="size-2 shrink-0 rounded-full" style={{ background: h.tag ? "#334155" : PALETTE[i % PALETTE.length] }} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      {h.owner ? <CopyButton value={h.owner} className="px-0" /> : <span className="text-xs text-muted-foreground">unknown</span>}
                      {h.tag === "lp" && <Badge variant="cyan">LP</Badge>}
                      {h.tag === "program" && <Badge>Program</Badge>}
                    </div>
                    <div className="mt-1 h-1 rounded-full bg-secondary">
                      <div className="h-1 rounded-full bg-accent/70" style={{ width: `${(h.pct / max) * 100}%` }} />
                    </div>
                  </div>
                  <div className="w-20 shrink-0 text-right">
                    <div className="num text-sm">{formatPct(h.pct)}</div>
                    <div className="num text-[0.68rem] text-muted-foreground">{formatNumber(h.amount, 0)}</div>
                  </div>
                  <div className="flex shrink-0 items-center">
                    {h.owner && !h.tag && (
                      isTracked(h.owner) ? (
                        <Button asChild variant="ghost" size="icon-sm" title="Open in tracker">
                          <Link href={`/tracker?w=${h.owner}`}>
                            <Radar className="text-primary" />
                          </Link>
                        </Button>
                      ) : (
                        <Button variant="ghost" size="icon-sm" title="Track wallet" onClick={() => track(h.owner!, `Holder #${h.rank}`)}>
                          <Plus />
                        </Button>
                      )
                    )}
                    <Button asChild variant="ghost" size="icon-sm" title="Solscan" className="hidden sm:inline-flex">
                      <a href={EXTERNAL.solscanAccount(h.owner ?? h.account)} target="_blank" rel="noreferrer">
                        <ExternalLink />
                      </a>
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </>
      )}
    </Card>
  );
}
