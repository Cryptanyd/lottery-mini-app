"use client";

import { useSyncExternalStore } from "react";

/**
 * Persistence layer for user data.
 *
 * Today: localStorage (per browser, zero backend). Every collection goes through
 * `createStore`, so moving to Supabase later means replacing this file's
 * read/write with API calls — components keep using the same hooks.
 */

export interface SavedToken {
  address: string;
  name: string | null;
  symbol: string | null;
  logo: string | null;
  addedAt: number;
}

export const WALLET_TAGS = ["Smart Money", "KOL", "Whale", "Insider", "Sniper", "Dev", "My Wallet"] as const;
export type WalletTag = (typeof WALLET_TAGS)[number];

export interface TrackedWallet {
  address: string;
  label: string;
  tags: WalletTag[];
  addedAt: number;
}

export interface HistoryItem {
  address: string;
  name: string | null;
  symbol: string | null;
  logo: string | null;
  riskScore: number | null;
  riskLevel: string | null;
  at: number;
}

export interface StoredLicense {
  license: string;
  wallet: string;
  expiresAt: number;
}

type Listener = () => void;

function createStore<T>(key: string, initial: T) {
  const storageKey = `scanx:v1:${key}`;
  let cache: T | undefined;
  const listeners = new Set<Listener>();

  const read = (): T => {
    if (cache !== undefined) return cache;
    if (typeof window === "undefined") return initial;
    try {
      const raw = window.localStorage.getItem(storageKey);
      cache = raw ? (JSON.parse(raw) as T) : initial;
    } catch {
      cache = initial;
    }
    return cache;
  };

  const write = (next: T) => {
    cache = next;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      /* storage full / private mode — keep in memory */
    }
    listeners.forEach((l) => l());
  };

  const subscribe = (l: Listener) => {
    listeners.add(l);
    // Keep multiple tabs in sync.
    const onStorage = (e: StorageEvent) => {
      if (e.key === storageKey) {
        cache = undefined;
        l();
      }
    };
    window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(l);
      window.removeEventListener("storage", onStorage);
    };
  };

  return {
    get: read,
    set: (updater: T | ((prev: T) => T)) =>
      write(typeof updater === "function" ? (updater as (p: T) => T)(read()) : updater),
    use: () => useSyncExternalStore(subscribe, read, () => initial),
  };
}

export const savedTokensStore = createStore<SavedToken[]>("saved-tokens", []);
export const walletsStore = createStore<TrackedWallet[]>("wallets", []);
export const historyStore = createStore<HistoryItem[]>("history", []);
export const licenseStore = createStore<StoredLicense | null>("license", null);

/* ------------------------------ helpers ------------------------------ */

export function pushHistory(item: Omit<HistoryItem, "at">, max: number) {
  historyStore.set((prev) => [{ ...item, at: Date.now() }, ...prev.filter((h) => h.address !== item.address)].slice(0, max));
}

export function exportAll() {
  return {
    exportedAt: new Date().toISOString(),
    savedTokens: savedTokensStore.get(),
    wallets: walletsStore.get(),
    history: historyStore.get(),
  };
}
