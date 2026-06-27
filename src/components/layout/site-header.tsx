import Link from "next/link";
import { BriefcaseBusiness, Plus } from "lucide-react";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/current-user";
import { cn } from "@/lib/utils";

export async function SiteHeader() {
  const user = await getCurrentUser({ allowPreview: true });

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex min-h-16 w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <Link
          href={user ? "/dashboard" : "/"}
          className="flex items-center gap-2 font-semibold tracking-tight"
        >
          <span className="flex size-8 items-center justify-center rounded-md bg-foreground text-background">
            <BriefcaseBusiness className="size-4" />
          </span>
          JobMaxxing
        </Link>

        <nav className="flex flex-wrap items-center justify-end gap-2">
          {user ? (
            <>
              <Link
                href="/dashboard"
                className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
              >
                Dashboard
              </Link>
              <Link
                href="/applications"
                className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
              >
                Applications
              </Link>
              <Link
                href="/applications/new"
                className={buttonVariants({ size: "sm" })}
              >
                <Plus className="size-4" />
                Add
              </Link>
              {user.isPreview ? (
                <Badge variant="outline">Preview</Badge>
              ) : (
                <SignOutButton />
              )}
            </>
          ) : (
            <>
              <Link
                href="/login"
                className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
              >
                Log in
              </Link>
              <Link href="/signup" className={buttonVariants({ size: "sm" })}>
                Sign up
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
