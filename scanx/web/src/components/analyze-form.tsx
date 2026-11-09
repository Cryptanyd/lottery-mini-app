"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, ClipboardPaste, Search } from "lucide-react";
import { Button } from "./ui/button";
import { extractAddress } from "@/lib/solana/address";
import { cn } from "@/lib/utils";

/**
 * Big CA input. Accepts a raw address or any link containing one
 * (dexscreener, pump.fun, birdeye, solscan, gmgn…).
 */
export function AnalyzeForm({ autoFocus, compact, initial = "" }: { autoFocus?: boolean; compact?: boolean; initial?: string }) {
  const router = useRouter();
  const [value, setValue] = useState(initial);
  const [error, setError] = useState<string | null>(null);

  const submit = (raw: string) => {
    const addr = extractAddress(raw);
    if (!addr) {
      setError(raw.trim() ? "That doesn't look like a Solana address (base58, 32–44 chars)." : "Paste a contract address first.");
      return;
    }
    setError(null);
    router.push(`/ca/${addr}`);
  };

  const paste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setValue(text);
      submit(text);
    } catch {
      setError("Clipboard access denied — paste manually (Ctrl/Cmd+V).");
    }
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit(value);
      }}
      className="w-full"
    >
      <div
        className={cn(
          "group relative flex items-center gap-2 overflow-hidden rounded-xl border bg-card/90 p-1.5 transition-colors focus-within:border-primary/60 focus-within:shadow-[0_0_0_4px_color-mix(in_oklab,var(--primary)_12%,transparent)]",
          error ? "border-destructive/60" : "border-border",
        )}
      >
        <Search className="ml-2.5 size-5 shrink-0 text-muted-foreground" />
        <input
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            if (error) setError(null);
          }}
          onPaste={(e) => {
            const text = e.clipboardData.getData("text");
            if (extractAddress(text)) {
              e.preventDefault();
              setValue(text.trim());
              submit(text);
            }
          }}
          autoFocus={autoFocus}
          spellCheck={false}
          autoComplete="off"
          inputMode="text"
          placeholder="Paste Solana CA or DexScreener / pump.fun link…"
          aria-label="Solana contract address"
          aria-invalid={!!error}
          className={cn(
            "min-w-0 flex-1 bg-transparent font-mono outline-none placeholder:font-sans placeholder:text-muted-foreground/70",
            compact ? "h-9 text-sm" : "h-11 text-sm sm:text-base",
          )}
        />
        <Button type="button" variant="ghost" size="icon-sm" onClick={paste} title="Paste from clipboard" className="hidden sm:inline-flex">
          <ClipboardPaste />
        </Button>
        <Button type="submit" size={compact ? "sm" : "lg"} className="shrink-0 font-mono uppercase tracking-wider">
          Analyze <ArrowRight />
        </Button>
      </div>
      {error && <p className="mt-2 pl-1 text-sm text-destructive">{error}</p>}
    </form>
  );
}
