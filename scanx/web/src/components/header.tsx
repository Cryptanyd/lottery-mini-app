"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { Crosshair, Radar, Star, Zap } from "lucide-react";
import { Logo } from "./logo";
import { Badge } from "./ui/misc";
import { usePlan } from "@/lib/client/plan";
import { cn } from "@/lib/utils";

// Wallet button reads window.* — render client-only to avoid hydration mismatch.
const WalletMultiButton = dynamic(
  () => import("@solana/wallet-adapter-react-ui").then((m) => m.WalletMultiButton),
  { ssr: false, loading: () => <div className="h-9 w-32 rounded-md border border-border bg-secondary" /> },
);

const NAV = [
  { href: "/", label: "Analyze", icon: Crosshair },
  { href: "/tracker", label: "Tracker", icon: Radar },
  { href: "/saved", label: "Saved", icon: Star },
  { href: "/pricing", label: "Pro", icon: Zap },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" || pathname.startsWith("/ca/") : pathname.startsWith(href);
}

export function Header() {
  const pathname = usePathname();
  const { isPro } = usePlan();

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4">
          <Link href="/" className="shrink-0" aria-label="ScanX home">
            <Logo />
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {NAV.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  "rounded-md px-3 py-1.5 font-mono text-xs uppercase tracking-wider transition-colors",
                  isActive(pathname, href)
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            {isPro ? (
              <Badge variant="warning" className="hidden sm:inline-flex">
                <Zap className="size-3" /> Pro
              </Badge>
            ) : (
              <Link href="/pricing" className="hidden sm:block">
                <Badge variant="accent" className="hover:bg-accent/20">
                  Free · Upgrade
                </Badge>
              </Link>
            )}
            <WalletMultiButton />
          </div>
        </div>
      </header>

      {/* Mobile bottom tab bar */}
      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden">
        {NAV.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex flex-col items-center gap-1 py-2 font-mono text-[0.62rem] uppercase tracking-wider",
              isActive(pathname, href) ? "text-primary" : "text-muted-foreground",
            )}
          >
            <Icon className="size-4" />
            {label}
          </Link>
        ))}
      </nav>
    </>
  );
}
