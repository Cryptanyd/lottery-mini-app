"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import { Download, Plus, Radar, UserPlus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState, Input } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { WalletDetail } from "./wallet-detail";
import { TagChip } from "./tag-chip";
import { useTrackWallet } from "@/lib/client/actions";
import { usePlan } from "@/lib/client/plan";
import { WALLET_TAGS, exportAll, type WalletTag } from "@/lib/client/store";
import { extractAddress, shortAddress } from "@/lib/solana/address";
import { cn } from "@/lib/utils";

export function TrackerClient() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { wallets, track } = useTrackWallet();
  const { limits, isPro } = usePlan();
  const { publicKey } = useWallet();

  const selected = params.get("w");
  const select = (a: string | null) => router.replace(a ? `${pathname}?w=${a}` : pathname, { scroll: false });

  const [filter, setFilter] = useState<WalletTag | "All">("All");
  const visible = useMemo(
    () => (filter === "All" ? wallets : wallets.filter((w) => w.tags.includes(filter))),
    [wallets, filter],
  );

  // Select first wallet by default on desktop.
  useEffect(() => {
    if (!selected && wallets.length && window.matchMedia("(min-width: 1024px)").matches) select(wallets[0].address);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, wallets.length]);

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(exportAll(), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `scanx-export-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Wallet tracker</h1>
          <p className="text-sm text-muted-foreground">Smart money, KOLs and your own wallets in one place.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="hud-label">
            <span className="num text-foreground">{wallets.length}</span> / {limits.trackedWallets} wallets
          </span>
          {isPro && (
            <Button variant="outline" size="sm" onClick={exportJson} title="Export JSON">
              <Download /> Export
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
        <div className="space-y-4">
          <AddWalletCard
            onAdd={(a, label, tags) => {
              if (track(a, label, tags)) select(a);
            }}
            myWallet={publicKey?.toBase58() ?? null}
          />

          <Card>
            <CardHeader>
              <CardTitle>Tracked</CardTitle>
            </CardHeader>
            <div className="flex gap-1.5 overflow-x-auto border-b border-border px-3 py-2 [scrollbar-width:none]">
              {(["All", ...WALLET_TAGS] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setFilter(t)}
                  className={cn(
                    "shrink-0 rounded px-2 py-1 font-mono text-[0.65rem] uppercase tracking-wider",
                    filter === t ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
            {!visible.length ? (
              <EmptyState icon={<Radar />} title={wallets.length ? "No wallets with this tag" : "No wallets yet"}>
                {wallets.length ? null : "Add a wallet above, or press + next to any top holder in a token report."}
              </EmptyState>
            ) : (
              <ul className="max-h-[60vh] divide-y divide-border overflow-y-auto">
                {visible.map((w) => (
                  <li key={w.address}>
                    <button
                      onClick={() => select(w.address)}
                      className={cn(
                        "flex w-full flex-col gap-1.5 px-4 py-2.5 text-left transition-colors hover:bg-secondary/60",
                        selected === w.address && "bg-secondary/80 shadow-[inset_2px_0_0_var(--primary)]",
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-medium">{w.label || shortAddress(w.address)}</span>
                        <span className="num text-xs text-muted-foreground">{shortAddress(w.address)}</span>
                      </div>
                      {w.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {w.tags.map((t) => (
                            <TagChip key={t} tag={t} active />
                          ))}
                        </div>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div id="wallet-detail" className="min-w-0">
          {selected ? (
            <WalletDetail key={selected} address={selected} onRemoved={() => select(null)} />
          ) : (
            <Card className="hidden lg:block">
              <EmptyState icon={<Radar />} title="Select a wallet">
                Balances, top tokens and recent transactions appear here.
              </EmptyState>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function AddWalletCard({
  onAdd,
  myWallet,
}: {
  onAdd: (address: string, label: string, tags: WalletTag[]) => void;
  myWallet: string | null;
}) {
  const [addr, setAddr] = useState("");
  const [label, setLabel] = useState("");
  const [tags, setTags] = useState<WalletTag[]>([]);
  const [error, setError] = useState<string | null>(null);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add wallet</CardTitle>
        {myWallet && (
          <button
            className="hud-label flex items-center gap-1 hover:text-primary"
            onClick={() => onAdd(myWallet, "My wallet", ["My Wallet"])}
          >
            <UserPlus className="size-3" /> add mine
          </button>
        )}
      </CardHeader>
      <CardContent>
        <form
          className="space-y-2.5"
          onSubmit={(e) => {
            e.preventDefault();
            const a = extractAddress(addr);
            if (!a) return setError("Invalid Solana address");
            setError(null);
            onAdd(a, label, tags);
            setAddr("");
            setLabel("");
            setTags([]);
          }}
        >
          <Input
            value={addr}
            onChange={(e) => setAddr(e.target.value)}
            placeholder="Wallet address"
            className="font-mono text-xs"
            spellCheck={false}
            aria-invalid={!!error}
          />
          <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Label (optional)" maxLength={40} />
          <div className="flex flex-wrap gap-1">
            {WALLET_TAGS.map((t) => (
              <TagChip
                key={t}
                tag={t}
                active={tags.includes(t)}
                onClick={() => setTags((p) => (p.includes(t) ? p.filter((x) => x !== t) : [...p, t]))}
              />
            ))}
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <Button type="submit" className="w-full">
            <Plus /> Track wallet
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
