import type { NextRequest } from "next/server";
import { json, preflight } from "@/lib/server/api";
import { verifyLicense } from "@/lib/server/license";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/pro/status  (Authorization: Bearer <license>)
 * Lets the extension / future premium endpoints check a license server-side.
 */
export async function GET(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? null;
  try {
    const lic = verifyLicense(token);
    return json(lic ? { pro: true, wallet: lic.w, expiresAt: lic.exp } : { pro: false });
  } catch (e) {
    console.error("[scanx] license check failed", e);
    return json({ pro: false });
  }
}

export const OPTIONS = preflight;
