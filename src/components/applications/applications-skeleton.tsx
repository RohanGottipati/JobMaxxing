import { Skeleton } from "@/components/ui/skeleton";

export function ApplicationsSkeleton() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 p-4 md:p-6 lg:p-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-44" />
          <Skeleton className="h-5 w-72 max-w-full" />
        </div>
        <Skeleton className="h-10 w-36" />
      </div>

      <Skeleton className="h-24 w-full rounded-xl" />

      <div className="-mx-4 overflow-hidden px-4 md:mx-0 md:px-0">
        <div className="grid min-w-max grid-cols-[repeat(5,minmax(17rem,1fr))] gap-4">
          {Array.from({ length: 5 }).map((_, columnIndex) => (
            <div
              key={columnIndex}
              className="grid min-h-[32rem] gap-3 rounded-lg border border-border/70 bg-muted/35 p-3"
            >
              <div className="space-y-2 border-b border-border/70 pb-3">
                <Skeleton className="h-5 w-28" />
                <Skeleton className="h-4 w-44" />
              </div>
              {Array.from({ length: 3 }).map((_, cardIndex) => (
                <Skeleton
                  key={cardIndex}
                  className="h-40 w-full rounded-lg bg-background/80"
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
