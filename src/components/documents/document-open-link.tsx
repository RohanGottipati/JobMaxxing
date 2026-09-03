import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { isLatexStudioHref } from "@/lib/latex/types";
import { cn } from "@/lib/utils";

/**
 * LaTeX Studio needs a full document load so COOP/COEP isolation applies.
 * Regular workspace routes keep client-side navigation.
 */
export function DocumentOpenLink({
  href,
  children,
  className,
  variant = "outline",
  size = "sm",
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
  variant?: "outline" | "ghost" | "default" | "secondary";
  size?: "sm" | "lg" | "default";
}) {
  const classes = cn(buttonVariants({ variant, size }), className);
  if (isLatexStudioHref(href)) {
    return (
      <a href={href} className={classes}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={classes}>
      {children}
    </Link>
  );
}
