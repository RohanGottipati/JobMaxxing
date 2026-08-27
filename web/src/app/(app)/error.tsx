"use client";

import Link from "next/link";
import { AlertTriangle, RefreshCw } from "lucide-react";

import { AppPage } from "@/components/layout/app-page";
import { Button, buttonVariants } from "@/components/ui/button";

export default function AppError({ reset }: { reset: () => void }) {
  return (
    <AppPage className="items-center justify-center text-center">
      <div className="surface-grid grid max-w-md justify-items-center rounded-xl border border-destructive/25 bg-card p-8 shadow-paper sm:p-10">
        <span className="grid size-11 place-items-center rounded-md border border-destructive/20 bg-destructive/10 text-destructive">
          <AlertTriangle aria-hidden className="size-5" />
        </span>
        <p className="micro-label mt-5 text-destructive">
          Something went wrong
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-[-0.035em]">
          We couldn’t load this page
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Your data is safe. Try loading the page again, or return to your dashboard.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button onClick={reset}>
            <RefreshCw aria-hidden />
            Try again
          </Button>
          <Link href="/dashboard" className={buttonVariants({ variant: "outline" })}>
            Return home
          </Link>
        </div>
      </div>
    </AppPage>
  );
}
