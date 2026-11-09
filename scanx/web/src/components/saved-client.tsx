"use client";

import { useState } from "react";
import Link from "next/link";
import { Clock, Radar, Star, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { TokenLogo } from "./common";
import { RISK_TEXT } from "./recent-scans";
import { TagChip } from "./wallet/tag-chip";
import { historyStore, savedTokensStore, walletsStore } from "@/lib/client/store";
import { shortAddress } from "@/lib/solana/address";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";

type Tab = "tokens" | "wallets" | "history";

export function SavedClient() {
  const [tab, setTab] = useState<Tab>("tokens");
  const tokens = savedTokensStore.use();
  const wallets = walletsStore.use();
  const history = historyStore.use();

  const tabs: { id: Tab; label: string; count: number; icon: typeof Star }[] = [
    { id: "tokens", label: "Tokens", count: tokens.length, icon: Star },
    { id: "wallets", label: "Wallets", count: wallets.length, icon: Radar },
    { id: "history", label: "History", count: history.length, icon: Clock },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Saved</h1>
        <p className="text-sm text-muted-foreground">Your watchlist, tracked wallets and scan history. Stored in this browser.</p>
      </div>

      <div className="inline-flex rounded-lg border border-border bg-card p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 font-mono text-xs uppercase tracking-wider",
              tab === t.id ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <t.icon className="size-3.5" />
            {t.label}
            <span className="num text-muted-foreground">{t.count}</span>
          </button>
        ))}
      </div>

      <Card>
        {tab === "tokens" &&
          (tokens.length ? (
            <ul className="divide-y divide-border">
              {tokens.map((t) => (
                <Row
                  key={t.address}
                  href={`/ca/${t.address}`}
                  left={<TokenLogo src={t.logo} symbol={t.symbol} className="size-8 text-[0.6rem]" />}
                  title={t.name ?? shortAddress(t.address)}
                  sub={`${t.symbol ? `$${t.symbol} · ` : ""}${shortAddress(t.address)}`}
                  right={<span className="num text-xs text-muted-foreground">{timeAgo(t.addedAt)}</span>}
                  onRemove={() => savedTokensStore.set((p) => p.filter((x) => x.address !== t.address))}
                />
              ))}
            </ul>
          ) : (
            <EmptyState icon={<Star />} title="No saved tokens">
              Press <b>Watch</b> on any token report to add it here.
            </EmptyState>
          ))}

        {tab === "wallets" &&
          (wallets.length ? (
            <ul className="divide-y divide-border">
              {wallets.map((w) => (
                <Row
                  key={w.address}
                  href={`/tracker?w=${w.address}`}
                  title={w.label || shortAddress(w.address)}
                  sub={shortAddress(w.address, 6, 6)}
                  right={
                    <div className="hidden flex-wrap justify-end gap-1 sm:flex">
                      {w.tags.map((t) => (
                        <TagChip key={t} tag={t} active />
                      ))}
                    </div>
                  }
                  onRemove={() => walletsStore.set((p) => p.filter((x) => x.address !== w.address))}
                />
              ))}
            </ul>
          ) : (
            <EmptyState icon={<Radar />} title="No tracked wallets">
              <Link href="/tracker" className="text-primary underline-offset-4 hover:underline">
                Open tracker
              </Link>
            </EmptyState>
          ))}

        {tab === "history" &&
          (history.length ? (
            <>
              <ul className="divide-y divide-border">
                {history.map((h) => (
                  <Row
                    key={h.address}
                    href={`/ca/${h.address}`}
                    left={<TokenLogo src={h.logo} symbol={h.symbol} className="size-8 text-[0.6rem]" />}
                    title={h.name ?? shortAddress(h.address)}
                    sub={`${h.symbol ? `$${h.symbol} · ` : ""}${timeAgo(h.at)}`}
                    right={
                      h.riskScore !== null ? (
                        <span className={cn("num text-sm font-semibold", RISK_TEXT[h.riskLevel ?? ""])}>{h.riskScore}</span>
                      ) : null
                    }
                    onRemove={() => historyStore.set((p) => p.filter((x) => x.address !== h.address))}
                  />
                ))}
              </ul>
              <div className="border-t border-border p-3 text-right">
                <Button variant="ghost" size="sm" onClick={() => historyStore.set([])}>
                  Clear history
                </Button>
              </div>
            </>
          ) : (
            <EmptyState icon={<Clock />} title="No scans yet">
              <Link href="/" className="text-primary underline-offset-4 hover:underline">
                Analyze a token
              </Link>
            </EmptyState>
          ))}
      </Card>
    </div>
  );
}

function Row({
  href,
  left,
  title,
  sub,
  right,
  onRemove,
}: {
  href: string;
  left?: React.ReactNode;
  title: string;
  sub: string;
  right?: React.ReactNode;
  onRemove: () => void;
}) {
  return (
    <li className="flex items-center gap-3 px-4 py-2.5 hover:bg-secondary/40">
      <Link href={href} className="flex min-w-0 flex-1 items-center gap-3">
        {left}
        <div className="min-w-0">
          <div className="truncate text-sm font-medium">{title}</div>
          <div className="num truncate text-xs text-muted-foreground">{sub}</div>
        </div>
      </Link>
      {right}
      <Button variant="ghost" size="icon-sm" onClick={onRemove} title="Remove">
        <Trash2 />
      </Button>
    </li>
  );
}
