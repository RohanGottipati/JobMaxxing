"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  closestCorners,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { setApplicationStatus } from "@/app/(app)/applications/actions";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import {
  applicationStatuses,
  type ApplicationStatus,
  type JobApplication,
} from "@/lib/applications/types";
import {
  formatDate,
  formatDateTime,
  statusDescriptions,
  statusLabels,
} from "@/lib/applications/status";
import { cn } from "@/lib/utils";

type ApplicationBoardProps = {
  applications: JobApplication[];
  visibleStatus: ApplicationStatus | "all";
};

const columnIdPrefix = "application-column:";

function getColumnId(status: ApplicationStatus) {
  return `${columnIdPrefix}${status}`;
}

function getStatusFromColumnId(id: UniqueIdentifier) {
  const value = String(id);

  if (!value.startsWith(columnIdPrefix)) {
    return null;
  }

  const status = value.slice(columnIdPrefix.length);

  return applicationStatuses.includes(status as ApplicationStatus)
    ? (status as ApplicationStatus)
    : null;
}

export function ApplicationBoard({
  applications,
  visibleStatus,
}: ApplicationBoardProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [cards, setCards] = useState(applications);
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const columns = useMemo(
    () =>
      visibleStatus === "all"
        ? applicationStatuses
        : applicationStatuses.filter((status) => status === visibleStatus),
    [visibleStatus],
  );

  function getStatusForDrop(id: UniqueIdentifier) {
    const columnStatus = getStatusFromColumnId(id);

    if (columnStatus) {
      return columnStatus;
    }

    return cards.find((card) => card.id === id)?.status ?? null;
  }

  function persistStatus(id: string, status: ApplicationStatus) {
    startTransition(async () => {
      await setApplicationStatus(id, status);
      router.refresh();
    });
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);

    if (!over) {
      return;
    }

    const activeId = active.id;

    if (activeId === over.id) {
      return;
    }

    const targetStatus = getStatusForDrop(over.id);

    if (!targetStatus) {
      return;
    }

    const previousStatus = cards.find(
      (card) => card.id === String(activeId),
    )?.status;

    setCards((currentCards) =>
      moveCard(currentCards, String(activeId), String(over.id), targetStatus),
    );

    if (previousStatus && previousStatus !== targetStatus) {
      persistStatus(String(activeId), targetStatus);
    }
  }

  function handleStatusChange(id: string, status: ApplicationStatus) {
    setCards((currentCards) =>
      moveCard(currentCards, id, getColumnId(status), status),
    );
    persistStatus(id, status);
  }

  const activeCard = activeId
    ? cards.find((card) => card.id === String(activeId))
    : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <div className="-mx-4 overflow-x-auto px-4 pb-2 md:mx-0 md:px-0">
        <div
          className={cn(
            "grid min-w-max gap-4",
            columns.length === 1
              ? "grid-cols-[minmax(18rem,34rem)]"
              : "grid-cols-[repeat(8,minmax(16rem,1fr))]",
          )}
        >
          {columns.map((status) => {
            const columnCards = cards.filter((card) => card.status === status);

            return (
              <ApplicationColumn
                key={status}
                status={status}
                applications={columnCards}
                activeCardId={activeCard?.id ?? null}
                onStatusChange={handleStatusChange}
              />
            );
          })}
        </div>
      </div>
    </DndContext>
  );
}

function moveCard(
  cards: JobApplication[],
  activeId: string,
  overId: string,
  targetStatus: ApplicationStatus,
) {
  const activeCard = cards.find((card) => card.id === activeId);

  if (!activeCard) {
    return cards;
  }

  const withoutActiveCard = cards.filter((card) => card.id !== activeId);
  const movedCard: JobApplication = {
    ...activeCard,
    status: targetStatus,
  };
  const overColumnStatus = getStatusFromColumnId(overId);

  if (!overColumnStatus) {
    const overIndex = withoutActiveCard.findIndex((card) => card.id === overId);

    if (overIndex >= 0) {
      const nextCards = [...withoutActiveCard];
      nextCards.splice(overIndex, 0, movedCard);
      return nextCards;
    }
  }

  const insertAfterIndex = findLastIndex(
    withoutActiveCard,
    (card) => card.status === targetStatus,
  );
  const nextCards = [...withoutActiveCard];

  nextCards.splice(insertAfterIndex + 1, 0, movedCard);

  return nextCards;
}

function findLastIndex<T>(items: T[], predicate: (item: T) => boolean) {
  for (let index = items.length - 1; index >= 0; index -= 1) {
    if (predicate(items[index])) {
      return index;
    }
  }

  return -1;
}

type ApplicationColumnProps = {
  status: ApplicationStatus;
  applications: JobApplication[];
  activeCardId: string | null;
  onStatusChange: (id: string, status: ApplicationStatus) => void;
};

function ApplicationColumn({
  status,
  applications,
  activeCardId,
  onStatusChange,
}: ApplicationColumnProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: getColumnId(status),
    data: {
      type: "column",
      status,
    },
  });

  return (
    <section className="flex max-h-[calc(100vh-17rem)] min-h-[32rem] flex-col rounded-lg border border-border bg-muted/20">
      <header className="grid gap-3 border-b border-border/70 p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="truncate text-sm font-semibold">
                {statusLabels[status]}
              </h2>
              <span className="rounded-full bg-background px-2 py-0.5 text-xs font-medium text-muted-foreground">
                {applications.length}
              </span>
            </div>
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
              {statusDescriptions[status]}
            </p>
          </div>
          <Link
            href={`/applications/new?status=${status}`}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "shrink-0")}
          >
            Add
          </Link>
        </div>
      </header>

      <div
        ref={setNodeRef}
        className={cn(
          "flex flex-1 flex-col gap-3 overflow-y-auto p-3 transition-colors",
          isOver && "bg-muted/40",
        )}
      >
        <SortableContext
          items={applications.map((application) => application.id)}
          strategy={verticalListSortingStrategy}
        >
          {applications.map((application) => (
            <ApplicationCard
              key={application.id}
              application={application}
              isActive={application.id === activeCardId}
              onStatusChange={onStatusChange}
            />
          ))}
        </SortableContext>

        {applications.length === 0 ? (
          <div className="flex min-h-32 items-center justify-center rounded-md border border-dashed border-border/80 bg-background/70 p-4 text-center text-sm text-muted-foreground">
            Drop applications here or add a new one.
          </div>
        ) : null}
      </div>
    </section>
  );
}

type ApplicationCardProps = {
  application: JobApplication;
  isActive: boolean;
  onStatusChange: (id: string, status: ApplicationStatus) => void;
};

function ApplicationCard({
  application,
  isActive,
  onStatusChange,
}: ApplicationCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: application.id,
    data: {
      type: "application",
      status: application.status,
    },
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={cn(
        "border-border/70 bg-background shadow-xs transition-shadow",
        isDragging && "opacity-70 shadow-md",
        isActive && "ring-1 ring-foreground/30",
      )}
    >
      <CardContent className="grid gap-3 p-3">
        <div className="flex items-start gap-2">
          <button
            type="button"
            className="mt-0.5 flex h-7 shrink-0 cursor-grab items-center rounded-md border border-border px-2 text-xs text-muted-foreground hover:bg-muted active:cursor-grabbing"
            aria-label={`Drag ${application.companyName}`}
            {...attributes}
            {...listeners}
          >
            Drag
          </button>
          <div className="min-w-0 flex-1">
            <Link
              href={`/applications/${application.id}`}
              className="line-clamp-2 text-sm font-semibold leading-5 underline-offset-4 hover:text-primary hover:underline"
            >
              {application.companyName}
            </Link>
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
              {application.jobTitle}
            </p>
          </div>
        </div>

        <div className="grid gap-2 text-xs text-muted-foreground">
          <span className="truncate">
            {application.location ?? "Location not set"}
          </span>
          <span className="truncate">
            Applied {formatDate(application.appliedAt)}
          </span>
          <span className="truncate">
            Created {formatDateTime(application.createdAt)}
          </span>
        </div>

        <Select
          aria-label={`Move ${application.companyName} to status`}
          value={application.status}
          onChange={(event) =>
            onStatusChange(
              application.id,
              event.target.value as ApplicationStatus,
            )
          }
          className="h-9 text-xs"
        >
          {applicationStatuses.map((status) => (
            <option key={status} value={status}>
              {statusLabels[status]}
            </option>
          ))}
        </Select>

        <div
          className={cn(
            "grid gap-2",
            application.jobUrl ? "grid-cols-3" : "grid-cols-2",
          )}
        >
          {application.jobUrl ? (
            <Link
              href={application.jobUrl}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
              target="_blank"
              rel="noreferrer"
            >
              Role
            </Link>
          ) : null}
          <Link
            href={`/applications/${application.id}`}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            View
          </Link>
          <Link
            href={`/applications/${application.id}/edit`}
            className={cn(buttonVariants({ size: "sm" }))}
          >
            Edit
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
