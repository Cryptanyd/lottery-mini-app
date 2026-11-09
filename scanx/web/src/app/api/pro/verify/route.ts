import type { NextRequest } from "next/server";
import { apiError, json, limitOr429, preflight, upstreamError } from "@/lib/server/api";
import { PaymentError, signLicense, verifyPayment } from "@/lib/server/license";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/pro/verify  { signature }
 * Verifies an on-chain SOL payment to the treasury and issues a signed Pro license.
 */
export async function POST(req: NextRequest) {
  const limited = limitOr429(req, "pro", 10);
  if (limited) return limited;

  let signature = "";
  try {
    signature = String((await req.json())?.signature ?? "").trim();
  } catch {
    /* fallthrough */
  }
  if (!/^[1-9A-HJ-NP-Za-km-z]{64,90}$/.test(signature)) {
    return apiError("bad_request", "Missing or invalid transaction signature", 400);
  }

  try {
    const payload = await verifyPayment(signature);
    return json({ license: signLicense(payload), wallet: payload.w, expiresAt: payload.exp, plan: payload.plan });
  } catch (e) {
    if (e instanceof PaymentError) return apiError("bad_request", e.message, 400);
    return upstreamError(e);
  }
}

export const OPTIONS = preflight;
