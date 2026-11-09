"use client";

import Link from "next/link";
import { historyStore } from "@/lib/client/store";
import { TokenLogo } from "./common";
import { cn } from "@/lib/utils";
import { shortAddress } from "@/lib/solana/address";

export const RISK_TEXT: Record<string, string> = {
  low: "text-success",
  medium: "text-warning",
  high: "text-destructive",
};

export function RecentScans() {
  const history = historyStore.use();
  if (!history.length) return null;
  return (
    <div className="mt-5">
      <p className="hud-label mb-2">Recent scans</p>
      <div className="flex flex-wrap justify-center gap-2">
        {history.slice(0, 6).map((h) => (
          <Link
            key={h.address}
            href={`/ca/${h.address}`}
            className="flex items-center gap-2 rounded-full border border-border bg-card/80 py-1 pl-1 pr-3 text-xs transition-colors hover:border-primary/40"
          >
            <TokenLogo src={h.logo} symbol={h.symbol} className="size-5 text-[0.5rem]" />
            <span className="font-mono">{h.symbol ? `$${h.symbol}` : shortAddress(h.address)}</span>
            {h.riskScore !== null && (
              <span className={cn("num", RISK_TEXT[h.riskLevel ?? ""] ?? "text-muted-foreground")}>{h.riskScore}</span>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
