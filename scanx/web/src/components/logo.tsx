import { cn } from "@/lib/utils";

/** Reticle mark: a scope ring with an amber core — "scan" at a glance. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("size-7", className)} aria-hidden>
      <rect width="32" height="32" rx="8" fill="#0b1020" />
      <circle cx="16" cy="16" r="9" fill="none" stroke="#8b7bff" strokeWidth="2" />
      <path d="M16 3v6M16 23v6M3 16h6M23 16h6" stroke="#4fd1c5" strokeWidth="2" strokeLinecap="round" />
      <circle cx="16" cy="16" r="3.2" fill="#f5b73b" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-2", className)}>
      <LogoMark />
      <span className="font-mono text-base font-semibold tracking-tight">
        Scan<span className="text-primary">X</span>
      </span>
    </span>
  );
}
