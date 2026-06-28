import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type AppPageSize = "narrow" | "form" | "wide";

const pageSizes: Record<AppPageSize, string> = {
  narrow: "max-w-2xl",
  form: "max-w-4xl",
  wide: "max-w-6xl",
};

type AppPageProps = {
  children: ReactNode;
  className?: string;
  size?: AppPageSize;
};

function AppPage({ children, className, size = "wide" }: AppPageProps) {
  return (
    <main
      className={cn(
        "mx-auto flex w-full flex-1 flex-col gap-5 px-4 py-5 animate-in fade-in-0 duration-200 sm:px-5 sm:py-6 lg:px-6",
        pageSizes[size],
        className
      )}
    >
      {children}
    </main>
  );
}

type AppPageHeaderProps = {
  action?: ReactNode;
  children?: ReactNode;
  className?: string;
  description?: ReactNode;
  title: ReactNode;
};

function AppPageHeader({
  action,
  children,
  className,
  description,
  title,
}: AppPageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between",
        className
      )}
    >
      <div className="min-w-0 space-y-1">
        <h1 className="text-2xl font-medium tracking-tight text-balance">
          {title}
        </h1>
        {description ? (
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        ) : null}
        {children}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export { AppPage, AppPageHeader };
