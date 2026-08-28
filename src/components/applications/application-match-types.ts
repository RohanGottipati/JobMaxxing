import type {
  EvidenceMatrixRow,
  JobMatchResult,
  JobStructuredData,
  TailoringChange,
} from "@/lib/job-intelligence/schemas";
import type { JobAnalysisFieldDiff } from "@/lib/job-intelligence/job-analysis-diff";

export type JobAnalysisView = {
  id: string;
  applicationId: string;
  sourceTextSnapshot: string;
  data: JobStructuredData;
  fieldConfidence: Record<string, number>;
  warnings: string[];
  parser: "deterministic" | "ai" | "hybrid";
  model: string | null;
  status: "review_required" | "confirmed";
  createdAt: string;
  updatedAt: string;
  confirmedAt: string | null;
  reanalysisDiff?: JobAnalysisFieldDiff[];
  remaining?: number;
};

export type JobMatchView = JobMatchResult & {
  id: string;
  applicationId: string;
  resumeId: string;
  resumeKind: "master" | "tailored";
  resumeRowVersion: number;
  profileRevision: number;
  jobAnalysisUpdatedAt: string;
  isStale?: boolean;
  createdAt: string;
  remaining?: number;
};

export type ResumeMatchOption = {
  id: string;
  kind: "master" | "tailored";
  label: string;
};

export type TailoringRunView = {
  id: string;
  applicationId: string;
  sourceResumeId: string;
  sourceResumeRowVersion: number;
  jobMatchId: string;
  changes: TailoringChange[];
  evidenceMatrix: EvidenceMatrixRow[];
  acceptedChangeIds: string[];
  outputResumeVersionId: string | null;
  status: "draft" | "applied" | "discarded";
  createdAt: string;
  remaining?: number;
};

export type CoverLetterGeneration = {
  id: string;
  versionNumber: number;
  content: string;
  evidence: Array<{ id: string; label: string; text: string }>;
  paragraphs: Array<{ text: string; evidenceIds: string[] }>;
  model: string | null;
  tone: "direct" | "warm" | "technical" | "startup" | "formal" | "enthusiastic";
  maxWords: 150 | 200 | 300;
  createdAt: string;
  remaining?: number;
};

export type BusyAction =
  | "import_job_url"
  | "analyze"
  | "confirm"
  | "match"
  | "tailor"
  | "apply"
  | "cover_letter"
  | "cover_letter_transform"
  | null;

export type OperationFailure = { message: string; code?: string };

export class ApiRequestError extends Error {
  code?: string;

  constructor(message: string, code?: string) {
    super(message);
    this.code = code;
  }
}

export async function requestJson<T>(
  url: string,
  init: RequestInit,
): Promise<T> {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    throw new ApiRequestError(
      "You appear to be offline. Reconnect and try again.",
      "OFFLINE",
    );
  }
  const response = await fetch(url, init);
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiRequestError(
      body?.error?.message ?? "The operation could not be completed.",
      body?.error?.code,
    );
  }
  return body as T;
}

export function toFailure(error: unknown): OperationFailure {
  return error instanceof ApiRequestError
    ? { message: error.message, code: error.code }
    : {
        message:
          error instanceof Error
            ? error.message
            : "The operation could not be completed.",
      };
}

export function toResumeValue(option: ResumeMatchOption) {
  return option.kind + ":" + option.id;
}

export function parseResumeValue(value: string) {
  const [kind, id] = value.split(":");
  return { kind: kind as "master" | "tailored", id };
}

export function humanize(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
