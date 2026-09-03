"use client";

import { AlertTriangle, FileQuestion, Loader2, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";

export function PreviewLoading({ label = "Loading preview…" }: { label?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="grid min-h-64 place-items-center gap-3 rounded-lg border border-border bg-parchment/30 p-8 text-center"
    >
      <Loader2 aria-hidden className="size-5 animate-spin text-muted-foreground" />
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

export function PreviewError({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="grid min-h-64 place-items-center gap-3 rounded-lg border border-destructive/35 bg-destructive/[0.04] p-8 text-center">
      <AlertTriangle aria-hidden className="size-5 text-destructive" />
      <p className="text-sm font-medium">{message}</p>
      {onRetry ? (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RotateCcw aria-hidden />
          Try again
        </Button>
      ) : null}
    </div>
  );
}

export function PreviewEmpty({
  title = "Nothing to preview yet",
  description,
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="grid min-h-64 place-items-center gap-3 rounded-lg border border-dashed border-border-strong bg-parchment/30 p-8 text-center">
      <FileQuestion aria-hidden className="size-5 text-muted-foreground" />
      <div className="grid gap-1">
        <p className="text-sm font-medium">{title}</p>
        {description ? (
          <p className="text-xs leading-5 text-muted-foreground">{description}</p>
        ) : null}
      </div>
    </div>
  );
}
