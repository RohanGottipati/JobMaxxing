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
        "mx-auto flex w-full flex-1 flex-col px-4 py-10",
        size === "narrow" ? "max-w-md" : "max-w-6xl gap-8",
        size === "default" && "gap-8",
        className
      )}
    >
      {children}
    </main>
  );
}
