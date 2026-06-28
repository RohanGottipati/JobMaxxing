import { APPLICATION_STATUSES } from "@/lib/applications/package-types";
import type {
  ApplicationStatus,
  CoverLetter,
  ResumeVersion,
} from "@/lib/applications/package-types";

export type { ApplicationStatus };

export const applicationStatuses = APPLICATION_STATUSES;

/**
 * UI-facing shape for an application, mapped from the `applications` table row.
 */
export type JobApplication = {
  id: string;
  userId: string;
  companyName: string;
  jobTitle: string;
  jobUrl: string | null;
  location: string | null;
  appliedAt: string | null;
  deadline: string | null;
  status: ApplicationStatus;
  jobDescription: string | null;
  notes: string | null;
  referralContact: string | null;
  nextAction: string | null;
  position: number;
  submittedResumeVersionId: string | null;
  submittedCoverLetterId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ApplicationFilters = {
  query?: string;
  status?: ApplicationStatus | "all";
};

/**
 * Full detail payload for one application, including the exact resume versions and
 * cover letters saved against it. Powers the board's detail drawer.
 */
export type ApplicationDetails = {
  application: JobApplication;
  resumeVersions: ResumeVersion[];
  coverLetters: CoverLetter[];
};
