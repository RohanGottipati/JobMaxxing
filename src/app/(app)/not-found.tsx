import Link from "next/link";
import { ArrowLeft, SearchX } from "lucide-react";

import { AppPage } from "@/components/layout/app-page";
import { buttonVariants } from "@/components/ui/button";

export default function AppNotFound() {
  return (
    <AppPage className="items-center justify-center text-center">
      <div className="surface-grid grid max-w-md justify-items-center rounded-xl border border-border-strong bg-card p-8 shadow-paper sm:p-10">
        <span className="grid size-11 place-items-center rounded-md border border-border bg-parchment text-muted-foreground">
          <SearchX aria-hidden className="size-5" />
        </span>
        <p className="micro-label mt-5 text-primary">
          Not found
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-[-0.035em]">
          This workspace item isn’t here
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          It may have been removed, or the link may no longer be valid.
        </p>
        <Link href="/dashboard" className={`${buttonVariants()} mt-6`}>
          <ArrowLeft aria-hidden />
          Return home
        </Link>
      </div>
    </AppPage>
  );
}
