export const applicationStatuses = [
  "saved",
  "applied",
  "interviewing",
  "offer",
  "rejected",
] as const;

export type ApplicationStatus = (typeof applicationStatuses)[number];

export type ApplicationDocumentType = "resume" | "cover_letter" | "other";

export type ApplicationDocument = {
  id: string;
  applicationId: string;
  type: ApplicationDocumentType;
  filename: string;
  uploadedAt: string;
  sizeLabel: string;
  storagePath: string;
};

export type StatusHistoryItem = {
  id: string;
  applicationId: string;
  userId: string;
  status: ApplicationStatus;
  createdAt: string;
};

export type JobApplication = {
  id: string;
  userId: string;
  companyName: string;
  jobTitle: string;
  jobUrl: string | null;
  location: string | null;
  appliedAt: string | null;
  status: ApplicationStatus;
  jobDescription: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  documents: ApplicationDocument[];
  statusHistory: StatusHistoryItem[];
};

export type ApplicationFilters = {
  query?: string;
  status?: ApplicationStatus | "all";
};
