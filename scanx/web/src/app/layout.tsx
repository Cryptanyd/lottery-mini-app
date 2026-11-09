import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Header } from "@/components/header";
import { APP_NAME, APP_TAGLINE, SITE_URL } from "@/lib/config";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: `${APP_NAME} — ${APP_TAGLINE}`, template: `%s · ${APP_NAME}` },
  description:
    "Paste any Solana contract address and get an instant risk report: authorities, holders, liquidity, age. Track smart-money wallets.",
  openGraph: { title: APP_NAME, description: APP_TAGLINE, url: SITE_URL, siteName: APP_NAME, type: "website" },
  twitter: { card: "summary", title: APP_NAME, description: APP_TAGLINE },
};

export const viewport: Viewport = { themeColor: "#06080f", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="scanx-bg">
        <Providers>
          <Header />
          <main className="mx-auto w-full max-w-6xl px-4 pb-28 pt-6 md:pb-16">{children}</main>
          <footer className="mx-auto hidden max-w-6xl px-4 pb-8 md:block">
            <p className="hud-label border-t border-border pt-4">
              {APP_NAME} · data: Solana RPC · DexScreener · Jupiter · not financial advice
            </p>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
