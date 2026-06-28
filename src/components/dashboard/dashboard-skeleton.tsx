import { Skeleton } from "@/components/ui/skeleton";

export function DashboardSkeleton() {
  return (
    <div className="flex flex-1 flex-col gap-8 p-4 md:p-6 lg:p-8">
      <div className="flex flex-col gap-8 xl:flex-row">
        <div className="min-w-0 flex-1 space-y-8">
          <div className="space-y-5">
            <Skeleton className="h-3 w-40" />
            <div className="space-y-2">
              <div className="flex justify-between">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-10" />
              </div>
              <Skeleton className="h-1.5 w-full rounded-full" />
            </div>
            <Skeleton className="h-10 w-3/4 max-w-lg" />
          </div>

          <div className="space-y-3">
            <Skeleton className="h-3 w-20" />
            <div className="flex gap-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="size-9 rounded-full" />
              ))}
            </div>
          </div>

          <div className="space-y-8">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="flex gap-4">
                <Skeleton className="size-8 shrink-0 rounded-full" />
                <div className="flex-1 space-y-3">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-6 w-2/3 max-w-sm" />
                  <Skeleton className="h-4 w-full max-w-md" />
                  {index === 1 ? <Skeleton className="h-20 w-full max-w-lg rounded-xl" /> : null}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid w-full gap-4 xl:w-80">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-44 w-full rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
