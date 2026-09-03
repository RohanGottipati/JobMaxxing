import { Skeleton } from "@/components/ui/skeleton";

export function ApplicationsMailboxSkeleton() {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <Skeleton className="h-12 w-full shrink-0 rounded-none" />
      <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(19rem,24rem)_minmax(0,1fr)]">
        <Skeleton className="rounded-none" />
        <Skeleton className="rounded-none" />
      </div>
    </div>
  );
}
