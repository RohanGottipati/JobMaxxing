import { AppPage } from "@/components/layout/app-page";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function AppLoading() {
  return (
    <AppPage>
      <div className="flex items-start justify-between gap-4">
        <div className="grid gap-2">
          <Skeleton className="h-8 w-52 sm:w-72" />
          <Skeleton className="h-4 w-64 max-w-[70vw] sm:w-96" />
        </div>
        <Skeleton className="hidden h-10 w-32 sm:block" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <Card key={index}>
            <CardHeader>
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
            </CardHeader>
            <CardContent className="grid gap-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="mt-6 h-9 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
      <span className="sr-only">Loading page</span>
    </AppPage>
  );
}
