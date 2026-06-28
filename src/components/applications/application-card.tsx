"use client";

import Link from "next/link";
import { memo, type KeyboardEvent, type MouseEvent, type PointerEvent } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  CalendarDays,
  ExternalLink,
  FileCheck,
  GripVertical,
  MapPin,
  NotebookPen,
  PanelTopOpen,
  Pencil,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { JobApplication } from "@/lib/applications/types";
import { formatDate, statusAccents } from "@/lib/applications/status";
import { cn } from "@/lib/utils";

type ApplicationCardFaceProps = {
  application: JobApplication;
  overlay?: boolean;
  onOpen?: (id: string) => void;
};

function stopCardAction(event: MouseEvent | PointerEvent) {
  event.stopPropagation();
}

function safeFormatDate(value: string | null | undefined) {
  if (!value || !Number.isFinite(new Date(value).getTime())) {
    return null;
  }

  return formatDate(value);
}

export function ApplicationCardFace({
  application,
  overlay = false,
  onOpen,
}: ApplicationCardFaceProps) {
  const accent = statusAccents[application.status];
  const hasResume = Boolean(application.submittedResumeVersionId);
  const hasCoverLetter = Boolean(application.submittedCoverLetterId);
  const visibleDate = application.appliedAt ?? application.deadline ?? application.updatedAt;
  const visibleDateLabel = safeFormatDate(visibleDate);

  return (
    <article
      className={cn(
        "group/card relative w-full overflow-hidden rounded-2xl border border-zinc-700/70 bg-zinc-900/95 text-zinc-100 shadow-[0_1px_0_rgba(0,0,0,0.45)] transition duration-150",
        "hover:-translate-y-0.5 hover:border-zinc-500 hover:bg-zinc-800/95 hover:shadow-xl hover:shadow-black/30",
        overlay && "w-72 rotate-[1.5deg] border-zinc-500 shadow-2xl shadow-black/40",
      )}
    >
      <div
        aria-hidden
        className={cn("absolute inset-x-0 top-0 h-1 rounded-t-2xl", accent.dot)}
      />

      {!overlay && onOpen ? (
        <CardActions application={application} onOpen={onOpen} />
      ) : null}

      <div className="p-3.5">
        <div className="min-w-0">
          <h3 className="line-clamp-2 text-sm leading-5 font-semibold text-zinc-100">
            {application.jobTitle}
          </h3>
          <p className="mt-1 truncate text-sm text-zinc-400">
            {application.companyName}
          </p>
        </div>

        {application.location ? (
          <p className="mt-2.5 flex min-w-0 items-center gap-1.5 text-xs text-zinc-400">
            <MapPin aria-hidden className="size-3.5 shrink-0" />
            <span className="truncate">{application.location}</span>
          </p>
        ) : null}

        <div className="mt-3 flex items-center justify-between gap-2">
          {visibleDateLabel ? (
            <span className="inline-flex items-center gap-1.5 text-xs text-zinc-400">
              <CalendarDays aria-hidden className="size-3.5" />
              {visibleDateLabel}
            </span>
          ) : (
            <div />
          )}

          <div className="flex shrink-0 items-center gap-1.5">
            {hasResume ? (
              <Tooltip>
                <TooltipTrigger>
                  <Badge variant="secondary" className="h-5 px-1.5 text-[0.65rem]">
                    <FileCheck aria-hidden className="size-3 mr-1" />
                    Resume
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>Resume submitted</TooltipContent>
              </Tooltip>
            ) : null}

            {hasCoverLetter ? (
              <Tooltip>
                <TooltipTrigger>
                  <Badge variant="secondary" className="h-5 px-1.5 text-[0.65rem]">
                    <NotebookPen aria-hidden className="size-3 mr-1" />
                    Cover
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>Cover letter submitted</TooltipContent>
              </Tooltip>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}

function CardActions({
  application,
  onOpen,
}: {
  application: JobApplication;
  onOpen: (id: string) => void;
}) {
  return (
    <div
      className="pointer-events-none absolute top-2.5 right-2.5 flex translate-y-1 items-center gap-1 opacity-0 transition group-hover/card:pointer-events-auto group-hover/card:translate-y-0 group-hover/card:opacity-100 group-focus-within/card:pointer-events-auto group-focus-within/card:translate-y-0 group-focus-within/card:opacity-100"
      onPointerDown={stopCardAction}
      onClick={stopCardAction}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label="Open details"
            className="grid size-7 place-items-center rounded-lg bg-zinc-800/95 text-zinc-200 shadow-sm ring-1 ring-zinc-700 transition hover:bg-zinc-700"
            onClick={(event) => {
              event.stopPropagation();
              onOpen(application.id);
            }}
          >
            <PanelTopOpen aria-hidden className="size-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent>Open details</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Link
            href={`/applications/${application.id}/edit`}
            aria-label="Edit application"
            className="grid size-7 place-items-center rounded-lg bg-zinc-800/95 text-zinc-200 shadow-sm ring-1 ring-zinc-700 transition hover:bg-zinc-700"
            onClick={stopCardAction}
          >
            <Pencil aria-hidden className="size-3.5" />
          </Link>
        </TooltipTrigger>
        <TooltipContent>Edit</TooltipContent>
      </Tooltip>

      {application.jobUrl ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              href={application.jobUrl}
              target="_blank"
              rel="noreferrer"
              aria-label="Open job post"
              className="grid size-7 place-items-center rounded-lg bg-zinc-800/95 text-zinc-200 shadow-sm ring-1 ring-zinc-700 transition hover:bg-zinc-700"
              onClick={stopCardAction}
            >
              <ExternalLink aria-hidden className="size-3.5" />
            </Link>
          </TooltipTrigger>
          <TooltipContent>Job post</TooltipContent>
        </Tooltip>
      ) : null}
    </div>
  );
}

type SortableApplicationCardProps = {
  application: JobApplication;
  onOpen: (id: string) => void;
};

export const SortableApplicationCard = memo(function SortableApplicationCard({
  application,
  onOpen,
}: SortableApplicationCardProps) {
  const {
    attributes,
    isDragging,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({
    id: application.id,
    data: {
      type: "application",
      application,
      status: application.status,
    },
  });
  const { onKeyDown: handleSortableKeyDown, ...sortableListeners } =
    listeners ?? {};

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      onOpen(application.id);
      return;
    }

    handleSortableKeyDown?.(event);
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      aria-label={`${application.jobTitle} at ${application.companyName}. Press Enter to open details.`}
      className={cn(
        "group/card w-full rounded-2xl outline-none transition duration-150 focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950",
        isDragging && "opacity-40",
      )}
      {...attributes}
      {...sortableListeners}
      onClick={() => onOpen(application.id)}
      onKeyDown={handleKeyDown}
    >
      <ApplicationCardFace application={application} onOpen={onOpen} />
    </div>
  );
});
