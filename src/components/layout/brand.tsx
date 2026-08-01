import Link from "next/link";

import { cn } from "@/lib/utils";

export function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      aria-hidden
      className={cn("size-8 shrink-0", className)}
    >
      <rect width="32" height="32" rx="8" fill="var(--primary)" />
      <g fill="var(--primary-foreground)">
        <rect x="7" y="19" width="4.5" height="6" rx="1.25" opacity="0.55" />
        <rect x="13.75" y="14" width="4.5" height="11" rx="1.25" opacity="0.8" />
        <rect x="20.5" y="7" width="4.5" height="18" rx="1.25" />
      </g>
      <path
        d="M7 27.25h18"
        stroke="var(--primary-foreground)"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.4"
      />
    </svg>
  );
}

export function Brand({
  href = "/",
  compact = false,
  className,
}: {
  href?: string;
  compact?: boolean;
  className?: string;
}) {
  return (
    <Link
      href={href}
      aria-label={compact ? "JobMaxxing home" : undefined}
      className={cn(
        "group inline-flex min-w-0 items-center gap-2.5 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      <BrandMark className="transition-transform duration-200 group-hover:-translate-y-0.5" />
      {!compact ? (
        <span className="truncate text-[15px] font-semibold tracking-[-0.02em]">
          Job<span className="text-primary">Maxxing</span>
        </span>
      ) : null}
    </Link>
  );
}
