"use client";

import { useState, useSyncExternalStore, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { usePathname } from "next/navigation";

import { AppSidebar } from "@/components/layout/app-sidebar";
import { MaxwellPanel } from "@/components/maxwell/maxwell-panel";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";

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
];

const MAXWELL_OPEN_KEY = "maxwell-open";
const MAXWELL_OPEN_EVENT = "jobmaxxing:maxwell-open";

function subscribeToMaxwellOpen(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(MAXWELL_OPEN_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(MAXWELL_OPEN_EVENT, callback);
  };
}

function getMaxwellOpenSnapshot() {
  return window.localStorage.getItem(MAXWELL_OPEN_KEY) === "true";
}

export function AppShell({ children, user }: AppShellProps) {
  const pathname = usePathname();
  const isMobile = useIsMobile();
  const maxwellOpen = useSyncExternalStore(subscribeToMaxwellOpen, getMaxwellOpenSnapshot, () => false);
  const [maxwellWidth, setMaxwellWidth] = useState(() => {
    if (typeof window === "undefined") return 420;
    const savedWidth = Number(window.localStorage.getItem("maxwell-width"));
    return Number.isFinite(savedWidth) && savedWidth >= 360 && savedWidth <= 560 ? savedWidth : 420;
  });
  function setOpen(open: boolean) {
    window.localStorage.setItem(MAXWELL_OPEN_KEY, String(open));
    window.dispatchEvent(new Event(MAXWELL_OPEN_EVENT));
  }
  function beginResize(event: ReactPointerEvent<HTMLButtonElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    const startX = event.clientX;
    const startWidth = maxwellWidth;
    const move = (moveEvent: PointerEvent) => {
      const width = Math.min(560, Math.max(360, startWidth + startX - moveEvent.clientX));
      setMaxwellWidth(width);
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      setMaxwellWidth((width) => {
        window.localStorage.setItem("maxwell-width", String(width));
        return width;
      });
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }
  const title =
    routeLabels.find(([prefix]) => pathname.startsWith(prefix))?.[1] ??
    "JobMaxxing";

  return (
    <SidebarProvider>
      <AppSidebar
        user={user}
        maxwellOpen={maxwellOpen}
        onMaxwellToggle={() => setOpen(!maxwellOpen)}
      />
      <div className="flex min-w-0 flex-1 overflow-hidden">
      <SidebarInset className="min-w-0 overflow-hidden">
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b border-border bg-background/85 px-3 backdrop-blur-md sm:px-5">
          <SidebarTrigger className="-ml-1 text-muted-foreground md:hidden" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[0.82rem] font-medium">{title}</p>
          </div>
          <ThemeToggle className="text-muted-foreground" />
        </header>
        <div className="surface-grid flex min-h-0 flex-1 flex-col">
          {children}
        </div>
      </SidebarInset>
      {!isMobile && maxwellOpen ? (
        <aside className="relative hidden shrink-0 border-l border-border md:flex" style={{ width: maxwellWidth }}>
          <button type="button" aria-label="Resize Maxwell panel" onPointerDown={beginResize} className="absolute inset-y-0 -left-1 z-20 w-2 cursor-col-resize touch-none before:absolute before:inset-y-0 before:left-1/2 before:w-px before:bg-transparent hover:before:bg-primary/40" />
          <MaxwellPanel userId={user.id} onClose={() => setOpen(false)} />
        </aside>
      ) : null}
      </div>
      {isMobile ? (
        <Sheet open={maxwellOpen} onOpenChange={setOpen}>
          <SheetContent side="right" showCloseButton={false} className="w-full max-w-none gap-0 p-0 sm:max-w-none">
            <SheetTitle className="sr-only">Maxwell assistant</SheetTitle>
            <SheetDescription className="sr-only">Chat with Maxwell about your JobMaxxing workspace.</SheetDescription>
            <MaxwellPanel userId={user.id} onClose={() => setOpen(false)} />
          </SheetContent>
        </Sheet>
      ) : null}
    </SidebarProvider>
  );
}
