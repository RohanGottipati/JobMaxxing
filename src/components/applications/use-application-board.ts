"use client";

import { useCallback, useMemo, useRef, useState, useTransition } from "react";
import {
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { toast } from "sonner";

import { reorderApplicationsAction } from "@/app/(app)/applications/actions";
import { applicationStatuses } from "@/lib/applications/types";
import type { ApplicationStatus, JobApplication } from "@/lib/applications/types";
import type { ApplicationReorderItem } from "@/lib/applications/packages";

const STATUS_SET = new Set<string>(applicationStatuses);

function isStatusId(id: UniqueIdentifier): id is ApplicationStatus {
  return STATUS_SET.has(String(id));
}

function groupByStatus(cards: JobApplication[]) {
  const groups = {} as Record<ApplicationStatus, JobApplication[]>;
  for (const status of applicationStatuses) {
    groups[status] = [];
  }
  for (const card of cards) {
    groups[card.status].push(card);
  }
  return groups;
}

/**
 * Builds the minimal set of {id, status, position} updates needed to turn `before` into
 * `after`, where position is the card's index within its status column.
 */
function diffUpdates(
  before: JobApplication[],
  after: JobApplication[],
): ApplicationReorderItem[] {
  const beforeGroups = groupByStatus(before);
  const previous = new Map<string, { status: ApplicationStatus; position: number }>();
  for (const status of applicationStatuses) {
    beforeGroups[status].forEach((card, index) => {
      previous.set(card.id, { status, position: index });
    });
  }

  const afterGroups = groupByStatus(after);
  const updates: ApplicationReorderItem[] = [];
  for (const status of applicationStatuses) {
    afterGroups[status].forEach((card, index) => {
      const prev = previous.get(card.id);
      if (!prev || prev.status !== status || prev.position !== index) {
        updates.push({ id: card.id, status, position: index });
      }
    });
  }
  return updates;
}

export function useApplicationBoard(initial: JobApplication[]) {
  const [cards, setCards] = useState<JobApplication[]>(initial);
  const cardsRef = useRef<JobApplication[]>(initial);
  const snapshotRef = useRef<JobApplication[] | null>(null);
  const justDraggedRef = useRef(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const commit = useCallback((next: JobApplication[]) => {
    cardsRef.current = next;
    setCards(next);
  }, []);

  const sensors = useSensors(
    // Mouse: small drag distance distinguishes a click from a drag.
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    // Touch: long-press to pick up, so normal swipes still scroll the column.
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
      keyboardCodes: {
        start: ["Space"],
        cancel: ["Escape"],
        end: ["Space"],
      },
    }),
  );

  const columns = useMemo(() => groupByStatus(cards), [cards]);
  const activeCard = activeId
    ? (cards.find((card) => card.id === activeId) ?? null)
    : null;

  const containerOf = useCallback(
    (id: UniqueIdentifier): ApplicationStatus | null => {
      if (isStatusId(id)) {
        return id;
      }
      return cardsRef.current.find((card) => card.id === String(id))?.status ?? null;
    },
    [],
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    justDraggedRef.current = true;
    snapshotRef.current = cardsRef.current;
    setActiveId(String(event.active.id));
  }, []);

  // Relocate the dragged card into a new column live, so it visually lifts between lanes.
  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { active, over } = event;
      if (!over) return;

      const activeStatus = containerOf(active.id);
      const overStatus = containerOf(over.id);
      if (!activeStatus || !overStatus || activeStatus === overStatus) return;

      const current = cardsRef.current;
      const activeCardData = current.find((card) => card.id === String(active.id));
      if (!activeCardData) return;

      const without = current.filter((card) => card.id !== String(active.id));
      const moved: JobApplication = { ...activeCardData, status: overStatus };

      let insertIndex: number;
      if (isStatusId(over.id)) {
        // Hovering the column body → append after that column's last card.
        let lastIndex = -1;
        without.forEach((card, index) => {
          if (card.status === overStatus) lastIndex = index;
        });
        insertIndex = lastIndex === -1 ? without.length : lastIndex + 1;
      } else {
        insertIndex = without.findIndex((card) => card.id === String(over.id));
        if (insertIndex < 0) insertIndex = without.length;
      }

      const next = [...without];
      next.splice(insertIndex, 0, moved);
      commit(next);
    },
    [commit, containerOf],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveId(null);
      window.setTimeout(() => {
        justDraggedRef.current = false;
      }, 0);

      const snapshot = snapshotRef.current;
      snapshotRef.current = null;
      if (!over || !snapshot) return;

      const current = cardsRef.current;
      let next = current;

      // Same-column reorder is finalised here (cross-column already handled in dragOver).
      if (!isStatusId(over.id) && String(active.id) !== String(over.id)) {
        const activeStatus = containerOf(active.id);
        const overStatus = containerOf(over.id);
        if (activeStatus && activeStatus === overStatus) {
          const activeIndex = current.findIndex((c) => c.id === String(active.id));
          const overIndex = current.findIndex((c) => c.id === String(over.id));
          if (activeIndex >= 0 && overIndex >= 0) {
            next = arrayMove(current, activeIndex, overIndex);
          }
        }
      }

      if (next !== current) {
        commit(next);
      }

      const updates = diffUpdates(snapshot, cardsRef.current);
      if (updates.length === 0) return;

      startTransition(async () => {
        try {
          await reorderApplicationsAction(updates);
        } catch {
          commit(snapshot);
          toast.error("Couldn't save your changes", {
            description: "The board was restored to its previous order.",
          });
        }
      });
    },
    [commit, containerOf],
  );

  const handleDragCancel = useCallback(() => {
    setActiveId(null);
    if (snapshotRef.current) {
      commit(snapshotRef.current);
      snapshotRef.current = null;
    }
    window.setTimeout(() => {
      justDraggedRef.current = false;
    }, 0);
  }, [commit]);

  // Guard against the synthetic click browsers fire after a real drag.
  const requestOpen = useCallback((id: string, open: (id: string) => void) => {
    if (justDraggedRef.current) return;
    open(id);
  }, []);

  return {
    columns,
    activeCard,
    sensors,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    handleDragCancel,
    requestOpen,
  };
}
