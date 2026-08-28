import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type AppPageSkeletonProps = {
  className?: string;
  rows?: number;
  size?: "narrow" | "form" | "wide";
};

const sizes = {
  narrow: "max-w-2xl",
  form: "max-w-4xl",
  wide: "max-w-6xl",
};

function AppPageSkeleton({
  className,
  rows = 3,
  size = "wide",
}: AppPageSkeletonProps) {
  return (
    <main
      className={cn(
        "mx-auto flex w-full flex-1 flex-col gap-5 px-4 py-5 animate-in fade-in-0 duration-200 sm:px-5 sm:py-6 lg:px-6",
        sizes[size],
        className
      )}
    >
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-full max-w-md" />
      </div>
      {Array.from({ length: rows }).map((_, index) => (
        <Skeleton key={index} className="h-28 w-full rounded-lg" />
      ))}
    </main>
  );
}

export { AppPageSkeleton };
