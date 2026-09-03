import { Suspense } from "react";

import { ApplicationMailbox } from "@/components/applications/application-mailbox";
import { ApplicationsMailboxSkeleton } from "@/components/applications/applications-mailbox-skeleton";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { getApplications } from "@/lib/applications/repository";
import { parseApplicationStatus } from "@/lib/applications/status";

type ApplicationsPageProps = {
  searchParams: Promise<{
    q?: string;
    status?: string;
    id?: string;
    view?: string;
    scope?: string;
  }>;
};

export default async function ApplicationsPage({
  searchParams,
}: ApplicationsPageProps) {
  await requireCurrentUser();
  const params = await searchParams;
  const status = parseApplicationStatus(params.status) ?? "all";
  const applications = await getApplications({
    query: params.q,
    status,
  });

  return (
    <Suspense fallback={<ApplicationsMailboxSkeleton />}>
      <ApplicationMailbox
        applications={applications}
        query={params.q}
        status={status}
      />
    </Suspense>
  );
}
