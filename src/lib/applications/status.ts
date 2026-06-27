import type { ApplicationStatus } from "@/lib/applications/types";
import { applicationStatuses } from "@/lib/applications/types";

export const statusLabels: Record<ApplicationStatus, string> = {
  saved: "Saved",
  applied: "Applied",
  interviewing: "Interviewing",
  offer: "Offer",
  rejected: "Rejected",
};

export const statusDescriptions: Record<ApplicationStatus, string> = {
  saved: "Bookmarked roles to revisit.",
  applied: "Applications submitted.",
  interviewing: "Active interview loops.",
  offer: "Offers or final-stage outcomes.",
  rejected: "Closed opportunities.",
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

export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}
