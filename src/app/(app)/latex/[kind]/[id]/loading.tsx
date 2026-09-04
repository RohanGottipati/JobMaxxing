import { Loader2 } from "lucide-react";

export default function LatexOverleafLoading() {
  return (
    <div className="grid min-h-72 place-items-center text-sm text-muted-foreground">
      <span className="inline-flex items-center gap-2">
        <Loader2 aria-hidden className="size-4 animate-spin" />
        Packaging project for Overleaf…
      </span>
    </div>
  );
}
