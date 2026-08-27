import Link from "next/link";
import { ArrowLeft, SearchX } from "lucide-react";

import { Brand } from "@/components/layout/brand";
import { MarketingFooter } from "@/components/layout/marketing-footer";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-border">
        <div className="mx-auto flex h-14 w-full max-w-[1200px] items-center justify-between px-5">
          <Brand />
          <ThemeToggle className="text-muted-foreground" />
        </div>
      </header>
      <main className="surface-grid grid flex-1 place-items-center bg-parchment px-4 py-16 text-center">
        <div className="grid max-w-lg justify-items-center">
          <span className="grid size-12 place-items-center rounded-md border border-border-strong bg-card text-muted-foreground shadow-paper">
            <SearchX aria-hidden className="size-6" />
          </span>
          <p className="micro-label mt-6 text-primary">
            Error 404
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.045em] text-balance sm:text-[2.7rem]">
            This page left the pipeline
          </h1>
          <p className="mt-4 max-w-md text-sm leading-7 text-muted-foreground sm:text-base">
            The link may be outdated, or the page may have moved. Head back to JobMaxxing and keep your search moving.
          </p>
          <Link href="/" className={`${buttonVariants({ size: "lg" })} mt-7`}>
            <ArrowLeft aria-hidden />
            Back to home
          </Link>
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
