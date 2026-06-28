import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { PipelineStep } from "@/lib/dashboard/helpers";
import { cn } from "@/lib/utils";

type PipelineTimelineProps = {
  steps: PipelineStep[];
};

export function PipelineTimeline({ steps }: PipelineTimelineProps) {
  return (
    <div className="relative space-y-0">
      {steps.map((step, index) => (
        <div key={step.id} className="relative flex gap-4 pb-10 last:pb-0">
          {index < steps.length - 1 ? (
            <span
              aria-hidden
              className={cn(
                "absolute left-[15px] top-8 h-[calc(100%-8px)] w-px",
                step.state === "done" ? "bg-foreground/40" : "bg-border"
              )}
            />
          ) : null}

          <StepMarker number={step.number} state={step.state} />

          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <StepBadge state={step.state} />
            </div>

            <div className="space-y-1">
              <h3
                className={cn(
                  "text-lg font-medium tracking-tight",
                  step.state === "upcoming" && "text-muted-foreground"
                )}
              >
                {step.title}
              </h3>
              <p
                className={cn(
                  "max-w-xl text-sm leading-relaxed",
                  step.state === "upcoming"
                    ? "text-muted-foreground/70"
                    : "text-muted-foreground"
                )}
              >
                {step.description}
              </p>
            </div>

            {step.state === "current" && step.action ? (
              <Card>
                <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-muted-foreground">
                    Your next move is ready.
                  </p>
                  <Link
                    href={step.action.href}
                    className={buttonVariants({ size: "sm" })}
                  >
                    {step.action.label}
                  </Link>
                </CardContent>
              </Card>
            ) : null}

            {step.state === "done" && step.action ? (
              <Link
                href={step.action.href}
                className="text-sm underline underline-offset-4"
              >
                {step.action.label}
              </Link>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}

function StepMarker({
  number,
  state,
}: {
  number: string;
  state: PipelineStep["state"];
}) {
  return (
    <div
      className={cn(
        "relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full border text-xs font-medium",
        state === "done" && "border-foreground bg-foreground text-background",
        state === "current" && "border-foreground text-foreground",
        state === "upcoming" && "border-border text-muted-foreground"
      )}
    >
      {number}
    </div>
  );
}

function StepBadge({ state }: { state: PipelineStep["state"] }) {
  if (state === "done") {
    return (
      <Badge variant="secondary" className="text-[10px] uppercase tracking-wider">
        Done
      </Badge>
    );
  }

  if (state === "current") {
    return (
      <Badge variant="outline" className="text-[10px] uppercase tracking-wider">
        Now
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="text-[10px] uppercase tracking-wider text-muted-foreground">
      Next
    </Badge>
  );
}
