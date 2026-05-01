import Link from "next/link";

import { cn } from "@/lib/utils";

type LogoProps = {
  className?: string;
  href?: string;
  showDot?: boolean;
};

function LogoMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("relative inline-flex h-2 w-2 items-center justify-center", className)}
    >
      <span className="absolute inset-0 rounded-full bg-primary animate-pulse-soft" />
      <span className="relative h-2 w-2 rounded-full bg-primary" />
    </span>
  );
}

export function Logo({ className, href = "/", showDot = true }: LogoProps) {
  const inner = (
    <span className="inline-flex items-center gap-2 font-mono text-sm tracking-[0.18em] uppercase">
      {showDot && <LogoMark />}
      <span className="text-foreground">flux</span>
    </span>
  );

  if (!href) return <span className={className}>{inner}</span>;

  return (
    <Link
      href={href}
      className={cn(
        "transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm",
        className,
      )}
    >
      {inner}
    </Link>
  );
}

export { LogoMark };
