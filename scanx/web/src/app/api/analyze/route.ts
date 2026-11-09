import type { NextRequest } from "next/server";
import { isSolanaAddress } from "@/lib/solana/address";
import { analyzeToken, AnalyzeError } from "@/lib/server/analyze-token";
import { cached } from "@/lib/server/cache";
import { apiError, json, limitOr429, preflight, upstreamError } from "@/lib/server/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/analyze?ca=<mint>
 * Public token report. Used by the web app and the ScanX browser extension.
 */
export async function GET(req: NextRequest) {
  const limited = limitOr429(req, "analyze", 40);
  if (limited) return limited;

  const ca = req.nextUrl.searchParams.get("ca")?.trim() ?? "";
  if (!isSolanaAddress(ca)) return apiError("invalid_address", "Invalid Solana address", 400);

  try {
    const report = await cached(`token:${ca}`, 30_000, () => analyzeToken(ca));
    return json(report, { maxAge: 30 });
  } catch (e) {
    if (e instanceof AnalyzeError) {
      return apiError(e.code === "not_found" ? "invalid_address" : "not_a_token", e.message, 404, { hint: e.hint });
    }
    return upstreamError(e);
  }
}

export const OPTIONS = preflight;
