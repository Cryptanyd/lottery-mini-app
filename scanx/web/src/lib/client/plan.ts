"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { LIMITS } from "@/lib/config";
import { licenseStore } from "./store";

export type Plan = "free" | "pro";

/**
 * Resolve the current plan. A license is bound to the paying wallet, so Pro is
 * active only while that wallet is connected. Server-side checks use
 * /api/pro/status for anything that must be enforced.
 */
export function usePlan() {
  const license = licenseStore.use();
  const { publicKey } = useWallet();
  const connected = publicKey?.toBase58() ?? null;

  const active = !!license && license.expiresAt > Date.now();
  const isPro = active && connected === license!.wallet;
  const plan: Plan = isPro ? "pro" : "free";

  return {
    plan,
    isPro,
    limits: LIMITS[plan],
    license,
    /** Valid license exists but a different (or no) wallet is connected. */
    licenseNeedsWallet: active && !isPro,
  };
}
