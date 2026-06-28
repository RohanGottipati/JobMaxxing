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
  saved: { dot: "bg-slate-400", badge: "border-slate-400/40 text-slate-500" },
  applied: { dot: "bg-sky-500", badge: "border-sky-500/40 text-sky-500" },
  online_assessment: {
    dot: "bg-violet-500",
    badge: "border-violet-500/40 text-violet-500",
  },
  interview: {
    dot: "bg-amber-500",
    badge: "border-amber-500/40 text-amber-600",
  },
  final_round: {
    dot: "bg-orange-500",
    badge: "border-orange-500/40 text-orange-500",
  },
  offer: {
    dot: "bg-emerald-500",
    badge: "border-emerald-500/40 text-emerald-600",
  },
  rejected: { dot: "bg-rose-500", badge: "border-rose-500/40 text-rose-500" },
  withdrawn: { dot: "bg-zinc-500", badge: "border-zinc-500/40 text-zinc-500" },
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

export function formatDate(value: string | null | undefined) {
  if (!value) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}
