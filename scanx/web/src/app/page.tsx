import { Crosshair, Puzzle, Radar, ShieldCheck } from "lucide-react";
import { AnalyzeForm } from "@/components/analyze-form";
import { RecentScans } from "@/components/recent-scans";
import { Card } from "@/components/ui/card";
import { EXTENSION_URL } from "@/lib/config";

const FEATURES = [
  {
    icon: ShieldCheck,
    title: "Instant risk score",
    body: "Mint & freeze authority, holder concentration ex-LP, liquidity, age and Token-2022 traps — every point explained.",
    color: "text-success",
  },
  {
    icon: Radar,
    title: "Smart-money tracker",
    body: "Save wallets, tag them KOL / Smart Money / Insider, and see balances, top bags and latest activity.",
    color: "text-accent",
  },
  {
    icon: Puzzle,
    title: "Works inside X",
    body: "The ScanX extension finds CAs in tweets and puts a one-click scan button right next to them.",
    color: "text-cyan",
  },
];

export default function HomePage() {
  return (
    <div className="space-y-10">
      <section className="mx-auto max-w-3xl pt-6 text-center sm:pt-14">
        <p className="hud-label mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-1">
          <span className="size-1.5 animate-pulse rounded-full bg-success" /> Solana mainnet · live
        </p>
        <h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-5xl">
          Scan any Solana CA <span className="text-primary">before</span> you ape.
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-pretty text-sm text-muted-foreground sm:text-base">
          Paste a contract address from Crypto Twitter and get authorities, top holders, liquidity, age and a
          transparent risk score in seconds.
        </p>
        <div className="mt-8">
          <AnalyzeForm autoFocus />
        </div>
        <RecentScans />
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        {FEATURES.map((f) => (
          <Card key={f.title} className="p-5">
            <f.icon className={`size-5 ${f.color}`} />
            <h2 className="mt-3 font-medium">{f.title}</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">{f.body}</p>
          </Card>
        ))}
      </section>

      <Card className="flex flex-col items-start gap-4 p-5 sm:flex-row sm:items-center">
        <div className="flex size-10 items-center justify-center rounded-lg border border-border bg-secondary">
          <Crosshair className="size-5 text-primary" />
        </div>
        <div className="flex-1">
          <h2 className="font-medium">ScanX for Chrome, Brave & Edge</h2>
          <p className="text-sm text-muted-foreground">
            Detects contract addresses in tweets and opens a full report in one click.
          </p>
        </div>
        <a
          href={EXTENSION_URL}
          target="_blank"
          rel="noreferrer"
          className="rounded-md border border-border bg-secondary px-4 py-2 font-mono text-xs uppercase tracking-wider hover:border-primary/40"
        >
          Get extension
        </a>
      </Card>
    </div>
  );
}
