"use client";

import { memo, type KeyboardEvent } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  CalendarDays,
  FileCheck,
  GripVertical,
  MapPin,
  NotebookPen,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { JobApplication } from "@/lib/applications/types";
import { formatDate, statusAccents } from "@/lib/applications/status";
import { cn } from "@/lib/utils";

type ApplicationCardFaceProps = {
  application: JobApplication;
  /** When true the card is rendered inside the drag overlay (elevated, no interactions). */
  overlay?: boolean;
};

/**
 * Pure visual representation of an application card. Shared by the sortable card on the
 * board and the floating card inside the drag overlay so the two never diverge.
 */
export const ApplicationCardFace = memo(function ApplicationCardFace({
  application,
  overlay = false,
}: ApplicationCardFaceProps) {
  const accent = statusAccents[application.status];
  const hasResume = Boolean(application.submittedResumeVersionId);
  const hasCoverLetter = Boolean(application.submittedCoverLetterId);
  const dateLabel = application.appliedAt
    ? `Applied ${formatDate(application.appliedAt)}`
    : application.deadline
      ? `Due ${formatDate(application.deadline)}`
      : null;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg border border-border/70 bg-card text-card-foreground ring-1 ring-foreground/5",
        "transition-[border-color,box-shadow,transform] duration-150 ease-out",
        overlay
          ? "rotate-[1.5deg] shadow-xl shadow-black/20"
          : "shadow-xs group-hover/card:border-border group-hover/card:shadow-sm",
      )}
    >
      <span
        aria-hidden
        className={cn("absolute inset-y-0 left-0 w-1", accent.dot)}
      />
      <div className="grid gap-2.5 p-3 pl-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold leading-5">
              {application.jobTitle}
            </p>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {application.companyName}
            </p>
          </div>
          <GripVertical
            aria-hidden
            className="mt-0.5 size-4 shrink-0 text-muted-foreground/40 transition-opacity group-hover/card:text-muted-foreground/70"
          />
        </div>

        {application.location ? (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin aria-hidden className="size-3.5 shrink-0" />
            <span className="truncate">{application.location}</span>
          </p>
        ) : null}

        {application.notes ? (
          <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground/90">
            {application.notes}
          </p>
        ) : null}

        {(dateLabel || hasResume || hasCoverLetter) && (
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            {dateLabel ? (
              <span className="inline-flex items-center gap-1 text-[0.7rem] text-muted-foreground">
                <CalendarDays aria-hidden className="size-3" />
                {dateLabel}
              </span>
            ) : null}
            {hasResume ? (
              <Badge
                variant="outline"
                className="gap-1 border-emerald-500/30 text-[0.65rem] text-emerald-600"
              >
                <FileCheck aria-hidden className="size-3" />
                Resume
              </Badge>
            ) : null}
            {hasCoverLetter ? (
              <Badge
                variant="outline"
                className="gap-1 border-emerald-500/30 text-[0.65rem] text-emerald-600"
              >
                <NotebookPen aria-hidden className="size-3" />
                Cover letter
              </Badge>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
});

type SortableApplicationCardProps = {
  application: JobApplication;
  onOpen: (id: string) => void;
};

/**
 * Draggable + clickable board card. The whole card is the drag handle (pointer + keyboard
 * via Space), while a plain click — or Enter — opens the detail drawer. The 8px pointer
 * activation distance keeps clicks from being read as drags.
 */
export const SortableApplicationCard = memo(function SortableApplicationCard({
  application,
  onOpen,
}: SortableApplicationCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: application.id,
    data: { type: "application", status: application.status },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      onOpen(application.id);
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group/card cursor-grab rounded-lg outline-none transition-transform duration-150 ease-out focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing",
        isDragging && "opacity-40",
      )}
      onClick={() => onOpen(application.id)}
      onKeyDown={handleKeyDown}
      aria-label={`${application.jobTitle} at ${application.companyName}. Press Enter to open details, Space to pick up.`}
      {...attributes}
      {...listeners}
    >
      <ApplicationCardFace application={application} />
    </div>
  );
});
