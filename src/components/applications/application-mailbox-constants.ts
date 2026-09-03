export type MailboxScope = "all" | "active" | "closed";

export type MailboxView =
  | "overview"
  | "job-description"
  | "resume"
  | "cover-letter"
  | "notes"
  | "activity";

export const MAILBOX_SCOPES: Array<{ id: MailboxScope; label: string }> = [
  { id: "all", label: "All applications" },
  { id: "active", label: "Active pipeline" },
  { id: "closed", label: "Closed" },
];

export const MAILBOX_VIEWS: Array<{ id: MailboxView; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "job-description", label: "Job description" },
  { id: "resume", label: "Resume" },
  { id: "cover-letter", label: "Cover letter" },
  { id: "notes", label: "Notes" },
  { id: "activity", label: "Activity" },
];

export function parseMailboxView(value: string | null | undefined): MailboxView {
  return MAILBOX_VIEWS.some((item) => item.id === value)
    ? (value as MailboxView)
    : "overview";
}

export function parseMailboxScope(value: string | null | undefined): MailboxScope {
  return MAILBOX_SCOPES.some((item) => item.id === value)
    ? (value as MailboxScope)
    : "all";
}
