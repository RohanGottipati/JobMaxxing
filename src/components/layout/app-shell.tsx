"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

import { AppSidebar } from "@/components/layout/app-sidebar";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { ThemeToggle } from "@/components/theme/theme-toggle";

type AppShellProps = {
  children: ReactNode;
  user: { id: string; email: string | null; name: string };
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
  ["/maxwell", "Maxwell"],
];

export function AppShell({ children, user }: AppShellProps) {
  const pathname = usePathname();
  const title =
    routeLabels.find(([prefix]) => pathname.startsWith(prefix))?.[1] ??
    "JobMaxxing";

  return (
    <SidebarProvider className="h-svh min-h-0 overflow-hidden">
      <AppSidebar user={user} />
      <SidebarInset className="h-svh min-w-0 overflow-hidden">
        <header className="z-30 flex h-14 shrink-0 items-center gap-2 border-b border-border bg-background/90 px-3 backdrop-blur-md sm:px-5">
          <SidebarTrigger className="-ml-1 text-muted-foreground md:hidden" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[0.82rem] font-medium">{title}</p>
          </div>
          <ThemeToggle className="text-muted-foreground" />
        </header>
        <div
          id="app-scroll-container"
          className="surface-grid flex min-h-0 flex-1 flex-col overflow-x-clip overflow-y-auto overscroll-y-contain"
        >
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
