"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";

import { AppSidebar } from "@/components/layout/app-sidebar";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { buttonVariants } from "@/components/ui/button";

type AppShellProps = {
  children: ReactNode;
  user: { email: string | null; name: string };
};

const routeLabels: Array<[string, string]> = [
  ["/dashboard", "Home"],
  ["/applications/new", "New application"],
  ["/applications", "Applications"],
  ["/resumes/versions/new", "New tailored resume"],
  ["/resumes/versions", "Tailored resume"],
  ["/resumes/new", "New master resume"],
  ["/resumes", "My Resumes"],
  ["/cover-letters/new", "New cover letter"],
  ["/cover-letters", "My Cover Letters"],
  ["/documentation", "Documentation"],
  ["/profile", "User Profile"],
];

export function AppShell({ children, user }: AppShellProps) {
  const pathname = usePathname();
  const title =
    routeLabels.find(([prefix]) => pathname.startsWith(prefix))?.[1] ??
    "JobMaxxing";

  return (
    <SidebarProvider>
      <AppSidebar user={user} />
      <SidebarInset className="min-w-0 overflow-hidden">
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b border-border bg-background/85 px-3 backdrop-blur-md sm:px-5">
          <SidebarTrigger className="-ml-1 text-muted-foreground" />
          <Separator orientation="vertical" className="mr-1 h-4" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[0.82rem] font-medium">{title}</p>
          </div>
          <Link href="/applications/new" className={`${buttonVariants({ size: "sm" })} hidden sm:inline-flex`}>
            <Plus aria-hidden />
            Add application
          </Link>
          <ThemeToggle className="text-muted-foreground" />
        </header>
        <div className="surface-grid flex min-h-0 flex-1 flex-col">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
