import type { NextRequest } from "next/server";
import { isSolanaAddress } from "@/lib/solana/address";
import { analyzeWallet } from "@/lib/server/analyze-wallet";
import { cached } from "@/lib/server/cache";
import { apiError, json, limitOr429, preflight, upstreamError } from "@/lib/server/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/wallet?address=<wallet> — SOL balance, top tokens, recent signatures. */
export async function GET(req: NextRequest) {
  const limited = limitOr429(req, "wallet", 30);
  if (limited) return limited;

  const address = req.nextUrl.searchParams.get("address")?.trim() ?? "";
  if (!isSolanaAddress(address)) return apiError("invalid_address", "Invalid Solana address", 400);

  try {
    const report = await cached(`wallet:${address}`, 30_000, () => analyzeWallet(address));
    return json(report, { maxAge: 30 });
  } catch (e) {
    return upstreamError(e);
  }
}

export const OPTIONS = preflight;
