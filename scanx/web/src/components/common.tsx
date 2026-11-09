"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { shortAddress } from "@/lib/solana/address";

export function CopyButton({ value, className, label }: { value: string; className?: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async (e) => {
        e.preventDefault();
        e.stopPropagation();
        try {
          await navigator.clipboard.writeText(value);
          setDone(true);
          toast.success("Copied");
          setTimeout(() => setDone(false), 1200);
        } catch {
          toast.error("Clipboard unavailable");
        }
      }}
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded px-1 font-mono text-xs text-muted-foreground transition-colors hover:text-foreground",
        className,
      )}
      aria-label={`Copy ${value}`}
    >
      {label ?? shortAddress(value, 6, 6)}
      {done ? <Check className="size-3.5 text-success" /> : <Copy className="size-3.5" />}
    </button>
  );
}

/** Token logo with graceful fallback to a monogram. */
export function TokenLogo({
  src,
  symbol,
  className,
}: {
  src: string | null | undefined;
  symbol: string | null | undefined;
  className?: string;
}) {
  const [broken, setBroken] = useState(false);
  const letter = (symbol ?? "?").replace(/^\$/, "").slice(0, 2).toUpperCase();
  if (!src || broken) {
    return (
      <div
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-full border border-border bg-gradient-to-br from-accent/30 to-cyan/20 font-mono text-xs font-semibold",
          className,
        )}
      >
        {letter}
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={symbol ?? "token"}
      onError={() => setBroken(true)}
      className={cn("size-10 shrink-0 rounded-full border border-border bg-secondary object-cover", className)}
      loading="lazy"
      referrerPolicy="no-referrer"
    />
  );
}

export function Stat({
  label,
  value,
  sub,
  tone,
  className,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  tone?: "up" | "down" | "warn" | null;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0 rounded-md border border-border bg-background/40 px-3 py-2.5", className)}>
      <div className="hud-label truncate">{label}</div>
      <div
        className={cn(
          "num mt-1 truncate text-base font-semibold sm:text-lg",
          tone === "up" && "text-success",
          tone === "down" && "text-destructive",
          tone === "warn" && "text-warning",
        )}
      >
        {value}
      </div>
      {sub && <div className="num mt-0.5 truncate text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}
