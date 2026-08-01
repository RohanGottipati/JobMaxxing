"use client";

import Link from "next/link";
import { memo } from "react";
import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { MoreHorizontal, Plus, SquarePlus } from "lucide-react";

import { SortableApplicationCard } from "@/components/applications/application-card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import type { ApplicationStatus, JobApplication } from "@/lib/applications/types";
import {
  statusAccents,
  statusLabels,
} from "@/lib/applications/status";
import { cn } from "@/lib/utils";

type ApplicationColumnProps = {
  status: ApplicationStatus;
  applications: JobApplication[];
  onOpen: (id: string) => void;
};

export const ApplicationColumn = memo(function ApplicationColumn({
  status,
  applications,
  onOpen,
}: ApplicationColumnProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: status,
    data: {
      type: "status",
      status,
    },
  });

  const accent = statusAccents[status];

  return (
    <section
      ref={setNodeRef}
      className={cn(
        "flex h-[calc(100dvh-15.5rem)] min-h-[27rem] max-h-[49rem] w-[268px] shrink-0 flex-col overflow-hidden rounded-xl border border-border bg-parchment/70 transition-colors",
        isOver && "border-primary/60 bg-primary/5",
      )}
      aria-label={`${statusLabels[status]} applications`}
    >
      <header className="flex items-center justify-between gap-3 border-b border-border px-3 py-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <span className={cn("size-2 rounded-full", accent.dot)} />
          <h2 className="truncate text-sm font-semibold tracking-normal">
            {statusLabels[status]}
          </h2>
          <span className="rounded bg-background px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground tabular-nums">
            {applications.length}
          </span>
        </div>

        <button
          type="button"
          className="grid size-8 shrink-0 place-items-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground"
          aria-label={`${statusLabels[status]} column options`}
        >
          <MoreHorizontal aria-hidden className="size-5" />
        </button>
      </header>

      <SortableContext
        items={applications.map((application) => application.id)}
        strategy={verticalListSortingStrategy}
      >
        <ScrollArea className="min-h-0 flex-1 px-2.5">
          <div className="flex flex-col gap-2 p-2">
            {applications.length ? (
              applications.map((application) => (
                <SortableApplicationCard
                  key={application.id}
                  application={application}
                  onOpen={onOpen}
                />
              ))
            ) : (
              <div className="flex min-h-28 flex-col items-center justify-center rounded-lg border border-dashed border-border-strong px-4 py-6 text-center">
                <p className="text-xs font-medium text-foreground">Nothing here yet</p>
                <p className="mt-1 text-[11px] text-muted-foreground">Drag a card in, or add one.</p>
              </div>
            )}
          </div>
          <ScrollBar orientation="vertical" />
        </ScrollArea>
      </SortableContext>

      <footer className="mt-auto border-t border-border px-3 py-2">
        <Link
          href={`/applications/new?status=${status}`}
          className="flex h-9 items-center justify-between rounded-lg px-3 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
        >
          <span className="inline-flex items-center gap-2">
            <Plus aria-hidden className="size-5" />
            Add a card
          </span>
          <SquarePlus aria-hidden className="size-5 text-muted-foreground" />
        </Link>
      </footer>
    </section>
  );
});
