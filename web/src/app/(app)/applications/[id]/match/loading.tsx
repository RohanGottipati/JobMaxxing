import { AppPage } from "@/components/layout/app-page";
import { Skeleton } from "@/components/ui/skeleton";

export default function ApplicationMatchLoading() {
  return (
    <AppPage size="wide">
      <div className="grid gap-3">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-9 w-72 max-w-full" />
        <Skeleton className="h-5 w-[34rem] max-w-full" />
      </div>
      <Skeleton className="h-20 w-full rounded-xl" />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <Skeleton className="h-[34rem] w-full rounded-xl" />
        <Skeleton className="h-80 w-full rounded-xl" />
      </div>
      <p className="sr-only" role="status">
        Loading career match workspace
      </p>
    </AppPage>
  );
}
