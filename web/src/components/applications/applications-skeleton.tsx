import { Skeleton } from "@/components/ui/skeleton";

export function ApplicationsSkeleton() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-5 px-4 py-5 sm:px-5 sm:py-6 lg:px-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-44" />
          <Skeleton className="h-5 w-72 max-w-full" />
        </div>
        <Skeleton className="h-10 w-36" />
      </div>

      <Skeleton className="h-[66px] w-full rounded-lg" />

      <div className="-mx-4 overflow-hidden px-4 md:mx-0 md:px-0">
        <div className="flex w-max gap-3">
          {Array.from({ length: 5 }).map((_, columnIndex) => (
            <div
              key={columnIndex}
              className="flex min-h-[21rem] w-64 flex-col gap-2 rounded-lg border border-border/70 bg-muted/30 p-2"
            >
              <div className="flex items-center gap-2 px-1 py-1.5">
                <Skeleton className="size-2 rounded-full" />
                <Skeleton className="h-4 w-24" />
              </div>
              {Array.from({ length: 3 }).map((_, cardIndex) => (
                <Skeleton
                  key={cardIndex}
                  className="h-24 w-full rounded-lg bg-background/80"
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
