"use client";

import { useId, useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  defaultDropAnimationSideEffects,
  type DropAnimation,
} from "@dnd-kit/core";

import { ApplicationCardFace } from "@/components/applications/application-card";
import { ApplicationColumn } from "@/components/applications/application-column";
import { ApplicationDetailsDrawer } from "@/components/applications/application-details-drawer";
import { useApplicationBoard } from "@/components/applications/use-application-board";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { applicationStatuses } from "@/lib/applications/types";
import type { ApplicationStatus, JobApplication } from "@/lib/applications/types";

type ApplicationBoardProps = {
  applications: JobApplication[];
  visibleStatus: ApplicationStatus | "all";
};

const dropAnimation: DropAnimation = {
  sideEffects: defaultDropAnimationSideEffects({
    styles: { active: { opacity: "0.4" } },
  }),
};

export function ApplicationBoard({
  applications,
  visibleStatus,
}: ApplicationBoardProps) {
  const {
    columns,
    activeCard,
    sensors,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    handleDragCancel,
    requestOpen,
  } = useApplicationBoard(applications);
  const [openId, setOpenId] = useState<string | null>(null);
  const dndContextId = useId();

  const visibleColumns = useMemo(
    () =>
      visibleStatus === "all"
        ? applicationStatuses
        : applicationStatuses.filter((status) => status === visibleStatus),
    [visibleStatus],
  );

  function handleOpen(id: string) {
    requestOpen(id, setOpenId);
  }

  return (
    <>
      <DndContext
        id={dndContextId}
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <ScrollArea className="-mx-4 pb-3 md:mx-0">
          <div className="flex w-max gap-2.5 px-4 md:px-0">
            {visibleColumns.map((status) => (
              <ApplicationColumn
                key={status}
                status={status}
                applications={columns[status]}
                onOpen={handleOpen}
              />
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        <DragOverlay dropAnimation={dropAnimation}>
          {activeCard ? (
            <div className="w-64">
              <ApplicationCardFace application={activeCard} overlay />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <ApplicationDetailsDrawer
        applicationId={openId}
        onOpenChange={(open) => {
          if (!open) setOpenId(null);
        }}
      />
    </>
  );
}
