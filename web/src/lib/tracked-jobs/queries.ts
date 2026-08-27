import { createClient } from "@/lib/supabase/server";

import { mapTrackedJobRow, type TrackedJob } from "@/lib/tracked-jobs/types";

/**
 * Fetch the current user's tracked jobs (captured by the JobTrack extension).
 * RLS scopes the result to the authenticated user automatically.
 */
export async function getTrackedJobs(): Promise<TrackedJob[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("tracked_jobs")
    .select("*")
    .order("applied_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to load tracked jobs: ${error.message}`);
  }

  return (data ?? []).map(mapTrackedJobRow);
}
