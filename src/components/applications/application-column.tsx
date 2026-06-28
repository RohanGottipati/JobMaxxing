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
  statusDescriptions,
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
        "flex h-[calc(100dvh-11rem)] min-h-[26rem] w-72 shrink-0 flex-col overflow-hidden rounded-2xl border border-black/30 bg-black/[0.88] text-zinc-100 shadow-2xl shadow-black/35 backdrop-blur-md transition",
        isOver && "border-sky-300/70 bg-zinc-950/95 ring-2 ring-sky-300/40",
      )}
      aria-label={`${statusLabels[status]} applications`}
    >
      <header className="flex items-center justify-between gap-3 px-4 py-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <span className={cn("size-2 rounded-full", accent.dot)} />
          <h2 className="truncate text-sm font-bold tracking-normal text-zinc-100">
            {statusLabels[status]}
          </h2>
          <span className="rounded-full bg-zinc-800/60 px-1.5 py-0.5 text-xs font-medium text-zinc-400 tabular-nums">
            {applications.length}
          </span>
        </div>

        <button
          type="button"
          className="grid size-8 shrink-0 place-items-center rounded-md text-zinc-400 transition hover:bg-white/10 hover:text-zinc-100"
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
          <div className="flex flex-col gap-2.5 pb-3">
            {applications.length ? (
              applications.map((application) => (
                <SortableApplicationCard
                  key={application.id}
                  application={application}
                  onOpen={onOpen}
                />
              ))
            ) : (
              <div className="rounded-lg border border-dashed border-zinc-700/80 bg-zinc-900/60 px-4 py-8 text-center text-sm text-zinc-500">
                Drop applications here.
              </div>
            )}
          </div>
          <ScrollBar orientation="vertical" />
        </ScrollArea>
      </SortableContext>

      <footer className="mt-auto border-t border-white/5 px-3 py-2.5">
        <Link
          href={`/applications/new?status=${status}`}
          className="flex h-9 items-center justify-between rounded-lg px-3 text-sm font-medium text-zinc-300 transition hover:bg-white/10 hover:text-white"
        >
          <span className="inline-flex items-center gap-2">
            <Plus aria-hidden className="size-5" />
            Add a card
          </span>
          <SquarePlus aria-hidden className="size-5 text-zinc-500" />
        </Link>
      </footer>
    </section>
  );
});
