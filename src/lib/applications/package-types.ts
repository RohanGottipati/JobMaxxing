import type { Database } from "@/types/database";

type Tables = Database["public"]["Tables"];

export type ApplicationStatus = Database["public"]["Enums"]["application_status"];

// Pipeline stages in display order. `satisfies` guarantees this stays in sync with the enum.
export const APPLICATION_STATUSES = [
  "saved",
  "applied",
  "online_assessment",
  "interview",
  "final_round",
  "offer",
  "rejected",
  "withdrawn",
] as const satisfies readonly ApplicationStatus[];

export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  saved: "Saved",
  applied: "Applied",
  online_assessment: "Online Assessment",
  interview: "Interview",
  final_round: "Final Round",
  offer: "Offer",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};

export type Application = Tables["applications"]["Row"];
export type ApplicationInsert = Tables["applications"]["Insert"];
export type ApplicationUpdate = Tables["applications"]["Update"];

export type Resume = Tables["resumes"]["Row"];
export type ResumeInsert = Tables["resumes"]["Insert"];

export type ResumeVersion = Tables["resume_versions"]["Row"];
export type ResumeVersionInsert = Tables["resume_versions"]["Insert"];

export type CoverLetter = Tables["cover_letters"]["Row"];
export type CoverLetterInsert = Tables["cover_letters"]["Insert"];

// Full read model: an application plus its submitted resume version and cover letter.
export type ApplicationPackage = Database["public"]["Views"]["application_packages"]["Row"];

export type PackageStatus =
  | "Package Complete"
  | "Resume Missing"
  | "Cover Letter Missing"
  | "Package Incomplete";

/**
 * Derives the human-readable package status from whichever documents are submitted.
 * Works against an Application row or an ApplicationPackage row.
 */
export function getPackageStatus(input: {
  submitted_resume_version_id: string | null;
  submitted_cover_letter_id: string | null;
}): PackageStatus {
  const hasResume = Boolean(input.submitted_resume_version_id);
  const hasCoverLetter = Boolean(input.submitted_cover_letter_id);

  if (hasResume && hasCoverLetter) {
    return "Package Complete";
  }

  if (!hasResume && !hasCoverLetter) {
    return "Package Incomplete";
  }

  return hasResume ? "Cover Letter Missing" : "Resume Missing";
}
