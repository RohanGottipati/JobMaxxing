import type { Database } from "@/types/database";

type TrackedJobRow = Database["public"]["Tables"]["tracked_jobs"]["Row"];

/**
 * Status vocabulary captured by the JobTrack extension. Distinct from the web app's
 * richer `applications` status enum — do not conflate the two.
 */
export const TRACKED_JOB_STATUSES = [
  "applied",
  "oa",
  "interview",
  "offer",
  "rejected",
  "ghosted",
] as const;

export type TrackedJobStatus = (typeof TRACKED_JOB_STATUSES)[number];

export const trackedJobStatusLabels: Record<TrackedJobStatus, string> = {
  applied: "Applied",
  oa: "OA",
  interview: "Interview",
  offer: "Offer",
  rejected: "Rejected",
  ghosted: "Ghosted",
};

/** Statuses that count as an "active" pipeline application for the stat pills. */
export const ACTIVE_TRACKED_JOB_STATUSES: TrackedJobStatus[] = [
  "applied",
  "oa",
  "interview",
];

/** Recruiting-season buckets shown in the left rail (mirrors the extension options page). */
export const TRACKED_JOB_SEASONS = ["Summer 2027", "Winter 2027"] as const;

/** Sentinel used in the UI for rows without a season set. */
export const UNASSIGNED_SEASON = "Unassigned";

/**
 * UI-facing shape for a tracked job, mapped from a `tracked_jobs` table row.
 * Mirrors the mapping style used for `applications` in ../applications/types.ts.
 */
export type TrackedJob = {
  id: string;
  userId: string;
  title: string;
  company: string;
  location: string | null;
  description: string | null;
  descriptionHash: string | null;
  appliedAt: string | null;
  status: TrackedJobStatus;
  sourceHost: string | null;
  season: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

function normalizeStatus(value: string | null): TrackedJobStatus {
  return (TRACKED_JOB_STATUSES as readonly string[]).includes(value ?? "")
    ? (value as TrackedJobStatus)
    : "applied";
}

/** Map a raw snake_case DB row into the camelCase UI shape. */
export function mapTrackedJobRow(row: TrackedJobRow): TrackedJob {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title ?? "Untitled role",
    company: row.company ?? "Unknown company",
    location: row.location,
    description: row.description,
    descriptionHash: row.description_hash,
    appliedAt: row.applied_at,
    status: normalizeStatus(row.status),
    sourceHost: row.source_host,
    season: row.season,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
