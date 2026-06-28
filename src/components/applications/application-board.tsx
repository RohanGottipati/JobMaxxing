"use client";

import { useMemo, useState } from "react";
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
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className="-mx-4 overflow-x-auto px-4 pb-3 md:mx-0 md:px-0">
          <div className="flex w-max gap-3">
            {visibleColumns.map((status) => (
              <ApplicationColumn
                key={status}
                status={status}
                applications={columns[status]}
                onOpen={handleOpen}
              />
            ))}
          </div>
        </div>

        <DragOverlay dropAnimation={dropAnimation}>
          {activeCard ? (
            <div className="w-72">
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
