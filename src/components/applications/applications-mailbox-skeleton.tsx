import { Skeleton } from "@/components/ui/skeleton";

export function ApplicationsMailboxSkeleton() {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background">
      <div className="flex h-14 shrink-0 items-center gap-3 border-b border-sidebar-border bg-sidebar px-4">
        <Skeleton className="h-5 w-28 bg-sidebar-accent" />
        <div className="hidden items-center gap-1.5 sm:flex">
          <Skeleton className="h-6 w-16 rounded-full bg-sidebar-accent" />
          <Skeleton className="h-6 w-16 rounded-full bg-sidebar-accent" />
        </div>
        <div className="flex-1" />
        <Skeleton className="hidden h-8 w-52 bg-sidebar-accent md:block" />
        <Skeleton className="h-8 w-24 bg-sidebar-accent" />
      </div>
      <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(19rem,24rem)_minmax(0,1fr)]">
        <section className="min-h-0 overflow-hidden border-r border-border">
          <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-14" />
          </div>
          <ul>
            {Array.from({ length: 7 }).map((_, index) => (
              <li key={index} className="flex items-start gap-3 border-b border-border px-3 py-3">
                <Skeleton className="size-9 shrink-0 rounded-full" />
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-4 w-16 rounded-full" />
                </div>
              </li>
            ))}
          </ul>
        </section>
        <section className="hidden min-h-0 p-8 lg:grid lg:place-items-center">
          <div className="grid w-full max-w-sm gap-3">
            <Skeleton className="mx-auto size-10 rounded-md" />
            <Skeleton className="mx-auto h-5 w-40" />
            <Skeleton className="mx-auto h-4 w-56" />
          </div>
        </section>
      </div>
    </div>
  );
}
