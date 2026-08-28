import { AppPage, AppPageHeader } from "@/components/layout/app-page";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { getTrackedJobs } from "@/lib/tracked-jobs/queries";

import { TrackerDashboard } from "@/components/tracker/tracker-dashboard";

export default async function ApplicationsPage() {
  await requireCurrentUser();
  const jobs = await getTrackedJobs();

  return (
    <AppPage size="full">
      <AppPageHeader
        title="Job Tracker"
        description="Every job captured by the JobTrack browser extension, in one dashboard."
      />

      <TrackerDashboard jobs={jobs} />
    </AppPage>
  );
}
