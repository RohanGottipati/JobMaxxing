import { Loader2 } from "lucide-react";

export default function LatexStudioLoading() {
  return (
    <div className="grid h-svh place-items-center text-sm text-muted-foreground">
      <span className="inline-flex items-center gap-2">
        <Loader2 aria-hidden className="size-4 animate-spin" />
        Opening LaTeX Studio…
      </span>
    </div>
  );
}
