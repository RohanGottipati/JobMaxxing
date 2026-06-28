"use client";

import { useId, useMemo, useState } from "react";
import {
  closestCorners,
  defaultDropAnimationSideEffects,
  DndContext,
  DragOverlay,
  type DropAnimation,
} from "@dnd-kit/core";

import { ApplicationCardFace } from "@/components/applications/application-card";
import { ApplicationColumn } from "@/components/applications/application-column";
import { ApplicationDetailsDrawer } from "@/components/applications/application-details-drawer";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import type { ApplicationStatus, JobApplication } from "@/lib/applications/types";
import { applicationStatuses } from "@/lib/applications/types";
import { useApplicationBoard } from "@/components/applications/use-application-board";

type ApplicationBoardProps = {
  applications: JobApplication[];
  visibleStatus: ApplicationStatus | "all";
};

const dropAnimation: DropAnimation = {
  sideEffects: defaultDropAnimationSideEffects({
    styles: {
      active: {
        opacity: "0.4",
      },
    },
  }),
};

export function ApplicationBoard({
  applications,
  visibleStatus,
}: ApplicationBoardProps) {
  const boardId = useId();
  const [openId, setOpenId] = useState<string | null>(null);
  const {
    activeCard,
    columns,
    handleDragCancel,
    handleDragEnd,
    handleDragOver,
    handleDragStart,
    requestOpen,
    sensors,
  } = useApplicationBoard(applications);

  const visibleStatuses = useMemo(
    () =>
      applicationStatuses.filter(
        (status) => visibleStatus === "all" || status === visibleStatus,
      ),
    [visibleStatus],
  );

  function handleOpen(id: string) {
    requestOpen(id, setOpenId);
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 text-zinc-100 shadow-xl">

      <DndContext
        id={boardId}
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <ScrollArea className="relative h-[calc(100dvh-9.5rem)] min-h-[32rem]">
          <div className="flex min-w-max gap-3 p-3">
            {visibleStatuses.map((status) => (
              <ApplicationColumn
                key={status}
                status={status}
                applications={columns[status] ?? []}
                onOpen={handleOpen}
              />
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        <DragOverlay dropAnimation={dropAnimation}>
          {activeCard ? (
            <ApplicationCardFace application={activeCard} overlay />
          ) : null}
        </DragOverlay>
      </DndContext>

      <ApplicationDetailsDrawer
        applicationId={openId}
        onOpenChange={(open) => {
          if (!open) {
            setOpenId(null);
          }
        }}
      />
    </div>
  );
}
