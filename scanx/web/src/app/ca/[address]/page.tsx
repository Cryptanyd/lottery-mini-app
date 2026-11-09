import type { Metadata } from "next";
import { AnalyzeForm } from "@/components/analyze-form";
import { TokenView } from "@/components/token/token-view";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/misc";
import { isSolanaAddress, shortAddress } from "@/lib/solana/address";

type Props = { params: Promise<{ address: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { address } = await params;
  return {
    title: isSolanaAddress(address) ? `Scan ${shortAddress(address)}` : "Invalid address",
    description: `ScanX risk report for Solana token ${address}`,
  };
}

/** Deep-linkable report: /ca/<mint>. Also the target URL of the browser extension. */
export default async function TokenPage({ params }: Props) {
  const { address } = await params;
  const valid = isSolanaAddress(address);

  return (
    <div className="space-y-5">
      <AnalyzeForm compact />
      {valid ? (
        <TokenView key={address} address={address} />
      ) : (
        <Card>
          <EmptyState title="Invalid Solana address">
            <span className="break-all font-mono text-xs">{address}</span>
          </EmptyState>
        </Card>
      )}
    </div>
  );
}
