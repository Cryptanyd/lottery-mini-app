import type { WalletTag } from "@/lib/client/store";
import { cn } from "@/lib/utils";

const TAG_COLORS: Record<WalletTag, string> = {
  "Smart Money": "border-success/40 text-success bg-success/10",
  KOL: "border-accent/40 text-accent bg-accent/10",
  Whale: "border-cyan/40 text-cyan bg-cyan/10",
  Insider: "border-warning/40 text-warning bg-warning/10",
  Sniper: "border-destructive/40 text-destructive bg-destructive/10",
  Dev: "border-sky-400/40 text-sky-400 bg-sky-400/10",
  "My Wallet": "border-foreground/30 text-foreground bg-foreground/5",
};

export function TagChip({ tag, active, onClick }: { tag: WalletTag; active?: boolean; onClick?: () => void }) {
  const Comp = onClick ? "button" : "span";
  return (
    <Comp
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "rounded border px-1.5 py-0.5 font-mono text-[0.62rem] uppercase tracking-wider transition-colors",
        active ? TAG_COLORS[tag] : "border-border text-muted-foreground hover:text-foreground",
      )}
    >
      {tag}
    </Comp>
  );
}
