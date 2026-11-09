"use client";

import { useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { Check, Loader2, Zap } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Badge, Input } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { LIMITS, PRO_PERIOD_DAYS, PRO_PRICE_SOL, TREASURY_ADDRESS } from "@/lib/config";
import { licenseStore, type StoredLicense } from "@/lib/client/store";
import { usePlan } from "@/lib/client/plan";
import { shortAddress } from "@/lib/solana/address";
import { cn } from "@/lib/utils";

const FREE_FEATURES = [
  "Unlimited CA scans",
  "Risk score, holders, liquidity, age",
  `Track up to ${LIMITS.free.trackedWallets} wallets`,
  `Watchlist up to ${LIMITS.free.savedTokens} tokens`,
  "Browser extension for X",
];

const PRO_FEATURES = [
  "Everything in Free",
  `Track up to ${LIMITS.pro.trackedWallets} wallets`,
  `Watchlist up to ${LIMITS.pro.savedTokens} tokens`,
  `Scan history of ${LIMITS.pro.history}`,
  "JSON export of all your data",
  "Soon: Telegram alerts on tracked wallets",
  "Soon: in-tweet quick-scan cards in the extension",
];

async function verify(signature: string): Promise<StoredLicense> {
  // The tx may take a few seconds to be visible to the server's RPC.
  let lastError = "Verification failed";
  for (let i = 0; i < 6; i++) {
    const res = await fetch("/api/pro/verify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ signature }),
    });
    const body = await res.json().catch(() => ({}));
    if (res.ok) return { license: body.license, wallet: body.wallet, expiresAt: body.expiresAt };
    lastError = body.error ?? lastError;
    if (!/not found yet|no block time/i.test(lastError)) break;
    await new Promise((r) => setTimeout(r, 2500));
  }
  throw new Error(lastError);
}

export function PricingClient() {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const { setVisible } = useWalletModal();
  const { isPro, license, licenseNeedsWallet } = usePlan();
  const [busy, setBusy] = useState(false);
  const [restoreSig, setRestoreSig] = useState("");

  const paymentsEnabled = !!TREASURY_ADDRESS;

  const activate = async (signature: string) => {
    const lic = await verify(signature);
    licenseStore.set(lic);
    toast.success("ScanX Pro activated", { description: `Valid until ${new Date(lic.expiresAt).toLocaleDateString()}` });
  };

  const pay = async () => {
    if (!publicKey) return setVisible(true);
    setBusy(true);
    try {
      const { PublicKey, SystemProgram, Transaction, LAMPORTS_PER_SOL } = await import("@solana/web3.js");
      const tx = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: new PublicKey(TREASURY_ADDRESS),
          lamports: Math.round(PRO_PRICE_SOL * LAMPORTS_PER_SOL),
        }),
      );
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
      tx.recentBlockhash = blockhash;
      tx.feePayer = publicKey;
      const signature = await sendTransaction(tx, connection);
      toast("Payment sent — confirming…");
      await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, "confirmed");
      await activate(signature);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Payment failed");
    } finally {
      setBusy(false);
    }
  };

  const restore = async () => {
    setBusy(true);
    try {
      await activate(restoreSig.trim());
      setRestoreSig("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not restore");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-semibold">
          Scan<span className="text-primary">X</span> Pro
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Pay in SOL straight from your wallet. No accounts, no cards, no subscriptions to cancel.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <PlanCard name="Free" price="0" period="forever" features={FREE_FEATURES} current={!isPro} />
        <PlanCard
          name="Pro"
          price={`${PRO_PRICE_SOL} SOL`}
          period={`${PRO_PERIOD_DAYS} days`}
          features={PRO_FEATURES}
          current={isPro}
          highlight
          action={
            isPro ? (
              <p className="text-center text-sm text-success">
                Active until {new Date(license!.expiresAt).toLocaleDateString()}
              </p>
            ) : !paymentsEnabled ? (
              <p className="text-center text-xs text-muted-foreground">Payments are not configured on this deployment.</p>
            ) : (
              <Button className="w-full" size="lg" onClick={pay} disabled={busy}>
                {busy ? <Loader2 className="animate-spin" /> : <Zap />}
                {publicKey ? `Pay ${PRO_PRICE_SOL} SOL` : "Connect wallet to upgrade"}
              </Button>
            )
          }
        />
      </div>

      {licenseNeedsWallet && license && (
        <Card className="border-warning/40 p-4 text-sm">
          You have an active Pro license for wallet <span className="font-mono">{shortAddress(license.wallet)}</span>.
          Connect that wallet to unlock Pro features.
        </Card>
      )}

      {paymentsEnabled && !isPro && (
        <Card className="p-4">
          <h2 className="hud-label mb-2">Already paid? Restore with transaction signature</h2>
          <form
            className="flex flex-col gap-2 sm:flex-row"
            onSubmit={(e) => {
              e.preventDefault();
              if (restoreSig.trim()) restore();
            }}
          >
            <Input
              value={restoreSig}
              onChange={(e) => setRestoreSig(e.target.value)}
              placeholder="Transaction signature"
              className="font-mono text-xs"
            />
            <Button type="submit" variant="secondary" disabled={busy || !restoreSig.trim()}>
              Restore
            </Button>
          </form>
        </Card>
      )}
    </div>
  );
}

function PlanCard({
  name,
  price,
  period,
  features,
  current,
  highlight,
  action,
}: {
  name: string;
  price: string;
  period: string;
  features: string[];
  current?: boolean;
  highlight?: boolean;
  action?: React.ReactNode;
}) {
  return (
    <Card className={cn("flex flex-col p-6", highlight && "border-primary/50 shadow-[0_0_60px_-20px_var(--primary)]")}>
      <div className="flex items-center justify-between">
        <h2 className="hud-label text-sm">{name}</h2>
        {current && <Badge variant={highlight ? "warning" : "default"}>Current</Badge>}
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="num text-4xl font-bold">{price}</span>
        <span className="text-sm text-muted-foreground">/ {period}</span>
      </div>
      <ul className="mt-5 flex-1 space-y-2">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm">
            <Check className={cn("mt-0.5 size-4 shrink-0", highlight ? "text-primary" : "text-muted-foreground")} />
            <span className={cn(f.startsWith("Soon") && "text-muted-foreground")}>{f}</span>
          </li>
        ))}
      </ul>
      {action && <div className="mt-6">{action}</div>}
    </Card>
  );
}
