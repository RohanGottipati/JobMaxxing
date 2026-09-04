import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
  return (
    <Link href={href} className={classes}>
      {children}
    </Link>
  );
}
