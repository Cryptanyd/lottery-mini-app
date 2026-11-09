"use client";

import { useCallback } from "react";
import { toast } from "sonner";
import { usePlan } from "./plan";
import { savedTokensStore, walletsStore, type SavedToken, type WalletTag } from "./store";

/** Save / unsave tokens, enforcing the plan limit with an upgrade nudge. */
export function useSaveToken() {
  const saved = savedTokensStore.use();
  const { limits, isPro } = usePlan();

  const isSaved = useCallback((address: string) => saved.some((t) => t.address === address), [saved]);

  const toggle = useCallback(
    (token: Omit<SavedToken, "addedAt">) => {
      if (savedTokensStore.get().some((t) => t.address === token.address)) {
        savedTokensStore.set((p) => p.filter((t) => t.address !== token.address));
        toast("Removed from watchlist");
        return;
      }
      if (savedTokensStore.get().length >= limits.savedTokens) {
        toast.error(`Free plan: up to ${limits.savedTokens} saved tokens`, {
          description: isPro ? undefined : "Upgrade to Pro for unlimited watchlists.",
          action: isPro ? undefined : { label: "Upgrade", onClick: () => (window.location.href = "/pricing") },
        });
        return;
      }
      savedTokensStore.set((p) => [{ ...token, addedAt: Date.now() }, ...p]);
      toast.success(`${token.symbol ? `$${token.symbol}` : "Token"} added to watchlist`);
    },
    [limits.savedTokens, isPro],
  );

  return { saved, isSaved, toggle };
}

export function useTrackWallet() {
  const wallets = walletsStore.use();
  const { limits, isPro } = usePlan();

  const isTracked = useCallback((a: string) => wallets.some((w) => w.address === a), [wallets]);

  const track = useCallback(
    (address: string, label = "", tags: WalletTag[] = []) => {
      if (walletsStore.get().some((w) => w.address === address)) {
        toast("Already tracking this wallet");
        return false;
      }
      if (walletsStore.get().length >= limits.trackedWallets) {
        toast.error(`Free plan: up to ${limits.trackedWallets} tracked wallets`, {
          description: isPro ? undefined : "Upgrade to Pro to track up to 500 wallets.",
          action: isPro ? undefined : { label: "Upgrade", onClick: () => (window.location.href = "/pricing") },
        });
        return false;
      }
      walletsStore.set((p) => [{ address, label: label.trim(), tags, addedAt: Date.now() }, ...p]);
      toast.success("Wallet added to tracker");
      return true;
    },
    [limits.trackedWallets, isPro],
  );

  return { wallets, isTracked, track };
}
