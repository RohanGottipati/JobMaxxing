import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type PageShellProps = {
  children: ReactNode;
  className?: string;
  size?: "default" | "narrow";
};

export function PageShell({
  children,
  className,
  size = "default",
}: PageShellProps) {
  return (
    <main
      className={cn(
        "mx-auto flex w-full flex-1 flex-col px-4 py-8 animate-in fade-in-0 duration-200 sm:px-5 sm:py-10",
        size === "narrow" ? "max-w-md" : "max-w-6xl gap-6",
        size === "default" && "gap-6",
        className
      )}
    >
      {children}
    </main>
  );
}
