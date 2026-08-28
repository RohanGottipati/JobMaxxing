import type { ApplicationStatus } from "@/lib/applications/types";
import { applicationStatuses } from "@/lib/applications/types";

export const statusLabels: Record<ApplicationStatus, string> = {
  saved: "Saved",
  applied: "Applied",
  online_assessment: "Online Assessment",
  interview: "Interview",
  final_round: "Final Round",
  offer: "Offer",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};

export const statusDescriptions: Record<ApplicationStatus, string> = {
  saved: "Bookmarked roles to revisit.",
  applied: "Applications submitted.",
  online_assessment: "Take-home or online assessments.",
  interview: "Active interview loops.",
  final_round: "Final-stage interviews.",
  offer: "Offers on the table.",
  rejected: "Closed opportunities.",
  withdrawn: "Roles you stepped away from.",
};

/**
 * Subtle per-status accents used on the board. `dot` colours the column marker and card
 * stripe; `badge` styles the status pill. Kept muted to stay on-brand with the grayscale UI.
 */
export const statusAccents: Record<
  ApplicationStatus,
  { dot: string; badge: string }
> = {
  saved: { dot: "bg-stage-saved", badge: "border-stage-saved/30 bg-stage-saved/10 text-stage-saved" },
  applied: { dot: "bg-stage-applied", badge: "border-stage-applied/30 bg-stage-applied/10 text-stage-applied" },
  online_assessment: {
    dot: "bg-stage-assessment",
    badge: "border-stage-assessment/30 bg-stage-assessment/10 text-stage-assessment",
  },
  interview: {
    dot: "bg-stage-interview",
    badge: "border-stage-interview/30 bg-stage-interview/10 text-stage-interview",
  },
  final_round: {
    dot: "bg-stage-final",
    badge: "border-stage-final/30 bg-stage-final/10 text-stage-final",
  },
  offer: {
    dot: "bg-stage-offer",
    badge: "border-stage-offer/30 bg-stage-offer/10 text-stage-offer",
  },
  rejected: { dot: "bg-stage-rejected", badge: "border-stage-rejected/30 bg-stage-rejected/10 text-stage-rejected" },
  withdrawn: { dot: "bg-stage-withdrawn", badge: "border-stage-withdrawn/30 bg-stage-withdrawn/10 text-stage-withdrawn" },
};

export function parseApplicationStatus(
  value: FormDataEntryValue | string | null | undefined,
) {
  if (typeof value !== "string") {
    return null;
  }

  return applicationStatuses.includes(value as ApplicationStatus)
    ? (value as ApplicationStatus)
    : null;
}

function parseFiniteDate(value: string | null | undefined, dateOnly = false) {
  if (!value) {
    return null;
  }

  const date = new Date(dateOnly ? `${value}T00:00:00` : value);

  if (!Number.isFinite(date.getTime())) {
    return null;
  }

  return date;
}

export function formatDate(value: string | null | undefined) {
  const date = parseFiniteDate(value, true);

  if (!date) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function formatDateTime(value: string | null | undefined) {
  const date = parseFiniteDate(value);

  if (!date) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}
