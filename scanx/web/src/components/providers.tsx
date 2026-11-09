"use client";

import { useMemo } from "react";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { Toaster } from "sonner";
import { PUBLIC_RPC_URL } from "@/lib/config";
import "@solana/wallet-adapter-react-ui/styles.css";

/**
 * Wallet login. Phantom, Solflare and Backpack all implement the Wallet Standard,
 * so they are auto-detected — no per-wallet adapter packages needed (smaller bundle).
 */
export function Providers({ children }: { children: React.ReactNode }) {
  const wallets = useMemo(() => [], []);
  return (
    <ConnectionProvider endpoint={PUBLIC_RPC_URL}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          {children}
          <Toaster
            theme="dark"
            position="bottom-right"
            toastOptions={{
              style: {
                background: "var(--popover)",
                border: "1px solid var(--border)",
                color: "var(--foreground)",
                fontFamily: "var(--font-mono)",
                fontSize: "12px",
              },
            }}
          />
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
