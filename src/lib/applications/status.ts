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
