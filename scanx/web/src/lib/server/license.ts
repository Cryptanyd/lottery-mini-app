import { createHmac, timingSafeEqual } from "node:crypto";
import { PRO_PERIOD_DAYS, PRO_PRICE_SOL, TREASURY_ADDRESS } from "@/lib/config";
import { rpc } from "./rpc";

/**
 * Stateless Pro licenses.
 *
 * Flow: user sends PRO_PRICE_SOL to TREASURY_ADDRESS from their wallet ->
 * client posts the tx signature -> we verify it on-chain -> return an
 * HMAC-signed license `base64url(payload).base64url(sig)`.
 *
 * No database needed. When Supabase is added, store licenses there as well
 * (to block signature reuse across wallets and allow renewals stacking).
 */
export interface LicensePayload {
  /** wallet */
  w: string;
  /** expiry, ms epoch */
  exp: number;
  /** payment tx signature */
  tx: string;
  plan: "pro";
}

function secret() {
  const s = process.env.LICENSE_SECRET;
  if (!s || s.length < 16 || s.startsWith("change-me")) {
    if (process.env.NODE_ENV === "production") throw new Error("LICENSE_SECRET is not configured");
    return "dev-only-insecure-license-secret";
  }
  return s;
}

const b64u = (b: Buffer | string) => Buffer.from(b).toString("base64url");

export function signLicense(p: LicensePayload): string {
  const body = b64u(JSON.stringify(p));
  const mac = createHmac("sha256", secret()).update(body).digest();
  return `${body}.${b64u(mac)}`;
}

export function verifyLicense(token: string | null | undefined): LicensePayload | null {
  if (!token) return null;
  const [body, mac] = token.split(".");
  if (!body || !mac) return null;
  const expected = createHmac("sha256", secret()).update(body).digest();
  const given = Buffer.from(mac, "base64url");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  try {
    const p = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as LicensePayload;
    return p.exp > Date.now() ? p : null;
  } catch {
    return null;
  }
}

interface ParsedTx {
  blockTime: number | null;
  meta: { err: unknown } | null;
  transaction: {
    message: {
      instructions: { program?: string; parsed?: { type: string; info: Record<string, unknown> } }[];
    };
  };
}

export class PaymentError extends Error {}

export async function verifyPayment(signature: string): Promise<LicensePayload> {
  if (!TREASURY_ADDRESS) throw new PaymentError("Payments are not configured on this deployment");

  const tx = await rpc<ParsedTx | null>("getTransaction", [
    signature,
    { encoding: "jsonParsed", maxSupportedTransactionVersion: 0, commitment: "confirmed" },
  ]);
  if (!tx) throw new PaymentError("Transaction not found yet — wait a few seconds and retry");
  if (tx.meta?.err) throw new PaymentError("Transaction failed on-chain");
  if (!tx.blockTime) throw new PaymentError("Transaction has no block time yet");

  const minLamports = Math.floor(PRO_PRICE_SOL * 1e9 * 0.99);
  const transfer = tx.transaction.message.instructions.find(
    (ix) =>
      ix.program === "system" &&
      ix.parsed?.type === "transfer" &&
      ix.parsed.info.destination === TREASURY_ADDRESS &&
      Number(ix.parsed.info.lamports) >= minLamports,
  );
  if (!transfer) throw new PaymentError(`No transfer of ≥ ${PRO_PRICE_SOL} SOL to the ScanX treasury found`);

  const paidAt = tx.blockTime * 1000;
  const exp = paidAt + PRO_PERIOD_DAYS * 86_400_000;
  if (exp < Date.now()) throw new PaymentError("This payment has already expired");

  return { w: String(transfer.parsed!.info.source), exp, tx: signature, plan: "pro" };
}
