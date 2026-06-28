"use client";

import Link from "next/link";
import { memo } from "react";
import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Plus } from "lucide-react";

import { SortableApplicationCard } from "@/components/applications/application-card";
import { buttonVariants } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ApplicationStatus, JobApplication } from "@/lib/applications/types";
import {
  statusAccents,
  statusDescriptions,
  statusLabels,
} from "@/lib/applications/status";
import { cn } from "@/lib/utils";

type ApplicationColumnProps = {
  status: ApplicationStatus;
  applications: JobApplication[];
  onOpen: (id: string) => void;
};

/**
 * A single status lane on the board. Acts as a drop target for cross-column moves and hosts
 * a vertical SortableContext for reordering cards within the lane.
 */
export const ApplicationColumn = memo(function ApplicationColumn({
  status,
  applications,
  onOpen,
}: ApplicationColumnProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: status,
    data: { type: "column", status },
  });
  const accent = statusAccents[status];

  return (
    <section className="flex max-h-[calc(100dvh-12.5rem)] min-h-[21rem] w-64 flex-col rounded-lg border border-border/70 bg-muted/30">
      <header className="flex items-center justify-between gap-2 px-3 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <span
            aria-hidden
            className={cn("size-2 shrink-0 rounded-full", accent.dot)}
          />
          <h2 className="truncate text-sm font-semibold">
            {statusLabels[status]}
          </h2>
          <span className="rounded-full bg-background px-1.5 text-xs font-medium text-muted-foreground tabular-nums">
            {applications.length}
          </span>
        </div>
        <Link
          href={`/applications/new?status=${status}`}
          aria-label={`Add application to ${statusLabels[status]}`}
          className={cn(
            buttonVariants({ variant: "ghost", size: "icon-sm" }),
            "shrink-0 text-muted-foreground",
          )}
        >
          <Plus aria-hidden className="size-4" />
        </Link>
      </header>

      <div
        ref={setNodeRef}
        className={cn(
          "flex min-h-0 flex-1 flex-col transition-colors",
          isOver && "bg-muted/60",
        )}
      >
        <ScrollArea className="min-h-0 flex-1 px-2 pb-2">
          <div className="flex min-h-full flex-col gap-2 pt-0.5">
            <SortableContext
              items={applications.map((application) => application.id)}
              strategy={verticalListSortingStrategy}
            >
              {applications.map((application) => (
                <SortableApplicationCard
                  key={application.id}
                  application={application}
                  onOpen={onOpen}
                />
              ))}
            </SortableContext>

            {applications.length === 0 ? (
              <div className="m-1 flex flex-1 items-center justify-center rounded-md border border-dashed border-border/70 p-4 text-center text-xs text-muted-foreground">
                {statusDescriptions[status]}
              </div>
            ) : null}
          </div>
        </ScrollArea>
      </div>
    </section>
  );
});
