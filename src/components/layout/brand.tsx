import Image from "next/image";
import Link from "next/link";

import { cn } from "@/lib/utils";

export function BrandMark({ className }: { className?: string }) {
  return (
    <Image
      src="/jobmaxxing-logo-transparent.png"
      alt=""
      aria-hidden
      width={64}
      height={64}
      className={cn("size-8 shrink-0 object-contain", className)}
    />
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
