"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

import { AppSidebar } from "@/components/layout/app-sidebar";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

type AppShellProps = {
  children: ReactNode;
  user: { id: string; email: string | null; name: string };
  onboardingIncomplete?: boolean;
};

const routeLabels: Array<[string, string]> = [
  ["/dashboard", "Home"],
  ["/applications/new", "New application"],
  ["/applications", "Applications"],
  ["/latex", "LaTeX Studio"],
  ["/resumes/versions/new", "New tailored resume"],
  ["/resumes/versions", "Tailored resume"],
  ["/resumes/new", "New master resume"],
  ["/resumes/import", "Import resume"],
  ["/resumes", "My Resumes"],
  ["/cover-letters/new", "New cover letter"],
  ["/cover-letters", "My Cover Letters"],
  ["/documentation", "Documentation"],
  ["/profile", "User Profile"],
  ["/maxwell", "Maxwell"],
];

export function AppShell({ children, user, onboardingIncomplete = false }: AppShellProps) {
  const pathname = usePathname();
  const latexEditor = /^\/latex\/(master_resume|resume_version|cover_letter)\//.test(pathname);
  if (latexEditor) return children;

  const applicationsWorkspace = pathname === "/applications";
  const title = pathname.match(/^\/applications\/[^/]+\/match(?:\/|$)/)
    ? "Career match"
    : routeLabels.find(([prefix]) => pathname.startsWith(prefix))?.[1] ??
      "JobMaxxing";

  return (
    <SidebarProvider className="h-svh min-h-0 overflow-hidden">
      <AppSidebar user={user} />
      <SidebarInset className="h-svh min-w-0 overflow-hidden">
        {!applicationsWorkspace ? (
          <header className="z-30 flex h-14 shrink-0 items-center gap-2 border-b border-sidebar-border bg-sidebar/95 px-3 backdrop-blur-md sm:px-5">
            <SidebarTrigger className="-ml-1 text-muted-foreground md:hidden" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[0.82rem] font-medium">{title}</p>
            </div>
          </header>
        ) : null}
        <div
          id="app-scroll-container"
          className="surface-grid flex min-h-0 flex-1 flex-col overflow-x-clip overflow-y-auto overscroll-y-contain"
        >
          {onboardingIncomplete ? (
            <div className="sticky top-0 z-20 flex flex-col gap-2 border-b border-warning/30 bg-background/95 px-4 py-2.5 text-sm backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <p><span className="font-medium">Your setup is saved.</span> Finish your profile when you have a moment.</p>
              <Link href="/onboarding" className="shrink-0 font-medium text-primary underline underline-offset-4">Continue setup</Link>
            </div>
          ) : null}
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
