import Link from "next/link";
import { Menu } from "lucide-react";

import { Brand } from "@/components/layout/brand";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { buttonVariants } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/current-user";
import { cn } from "@/lib/utils";

export async function MarketingHeader() {
  const user = await getCurrentUser();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 w-full max-w-[1200px] items-center justify-between gap-4 px-5">
        <Brand />
        <nav className="hidden items-center gap-1 text-[0.84rem] text-muted-foreground md:flex" aria-label="Main navigation">
          <Link href="/#features" className="rounded-md px-3 py-1.5 font-medium transition-colors hover:bg-accent hover:text-foreground">Features</Link>
          <Link href="/#how-it-works" className="rounded-md px-3 py-1.5 font-medium transition-colors hover:bg-accent hover:text-foreground">How it works</Link>
          <Link href="/#faq" className="rounded-md px-3 py-1.5 font-medium transition-colors hover:bg-accent hover:text-foreground">FAQ</Link>
        </nav>
        <div className="flex items-center gap-1.5">
          <ThemeToggle className="text-muted-foreground" />
          {user ? (
            <Link href="/dashboard" className={buttonVariants({ size: "sm" })}>
              Open app
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "hidden sm:inline-flex")}
              >
                Log in
              </Link>
              <Link href="/signup" className={buttonVariants({ size: "sm" })}>
                Get started
              </Link>
            </>
          )}
          <details className="relative md:hidden">
            <summary className="grid size-8 cursor-pointer list-none place-items-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground [&::-webkit-details-marker]:hidden" aria-label="Open navigation">
              <Menu aria-hidden className="size-4" />
            </summary>
            <nav className="absolute right-0 top-10 grid w-44 gap-1 rounded-lg border border-border bg-popover p-2 shadow-[0_12px_30px_-16px_rgb(0_0_0/0.4)]" aria-label="Mobile navigation">
              <Link href="/#features" className="rounded-md px-3 py-2 text-sm hover:bg-accent">Features</Link>
              <Link href="/#how-it-works" className="rounded-md px-3 py-2 text-sm hover:bg-accent">How it works</Link>
              <Link href="/#faq" className="rounded-md px-3 py-2 text-sm hover:bg-accent">FAQ</Link>
            </nav>
          </details>
        </div>
      </div>
    </header>
  );
}
