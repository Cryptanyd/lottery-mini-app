import { AlertTriangle, CheckCircle2, Info, ShieldAlert } from "lucide-react";
import type { TokenReport } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const LEVEL = {
  low: { label: "Low risk", color: "var(--success)", text: "text-success" },
  medium: { label: "Medium risk", color: "var(--warning)", text: "text-warning" },
  high: { label: "High risk", color: "var(--destructive)", text: "text-destructive" },
  unknown: { label: "Unknown", color: "var(--muted-foreground)", text: "text-muted-foreground" },
} as const;

const SEGMENTS = 24;

export function RiskPanel({ risk }: { risk: TokenReport["risk"] }) {
  const lvl = LEVEL[risk.level];
  const lit = Math.round((risk.score / 100) * SEGMENTS);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Risk score</CardTitle>
        <span className={cn("hud-label", lvl.text)}>{lvl.label}</span>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-end gap-3">
          <span className={cn("num text-5xl font-bold leading-none", lvl.text)}>{risk.score}</span>
          <span className="num pb-1 text-sm text-muted-foreground">/ 100</span>
        </div>

        {/* Segmented meter, HUD style */}
        <div className="flex gap-[3px]" role="meter" aria-valuenow={risk.score} aria-valuemin={0} aria-valuemax={100}>
          {Array.from({ length: SEGMENTS }, (_, i) => (
            <div
              key={i}
              className="h-3 flex-1 rounded-[2px]"
              style={{
                background: i < lit ? lvl.color : "var(--secondary)",
                opacity: i < lit ? 0.45 + (0.55 * (i + 1)) / SEGMENTS : 1,
              }}
            />
          ))}
        </div>

        <ul className="divide-y divide-border">
          {risk.factors.map((f) => (
            <li key={f.id} className="flex items-start gap-2.5 py-2">
              <FactorIcon status={f.status} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">{f.label}</span>
                  {f.points > 0 && <span className="num text-xs text-destructive">+{f.points}</span>}
                </div>
                <p className="text-xs text-muted-foreground">{f.detail}</p>
              </div>
            </li>
          ))}
        </ul>
        <p className="text-[0.7rem] leading-relaxed text-muted-foreground">
          Heuristic score from on-chain data. Not financial advice — always DYOR.
        </p>
      </CardContent>
    </Card>
  );
}

function FactorIcon({ status }: { status: string }) {
  const cls = "mt-0.5 size-4 shrink-0";
  if (status === "ok") return <CheckCircle2 className={cn(cls, "text-success")} />;
  if (status === "warn") return <AlertTriangle className={cn(cls, "text-warning")} />;
  if (status === "danger") return <ShieldAlert className={cn(cls, "text-destructive")} />;
  return <Info className={cn(cls, "text-muted-foreground")} />;
}
