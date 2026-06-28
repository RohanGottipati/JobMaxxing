import Link from "next/link";

import { AppPage, AppPageHeader } from "@/components/layout/app-page";
import { buttonVariants } from "@/components/ui/button";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { getApplications } from "@/lib/applications/repository";
import { parseApplicationStatus } from "@/lib/applications/status";

import { ApplicationList } from "@/components/applications/application-list";

type ApplicationsPageProps = {
  searchParams: Promise<{
    q?: string;
    status?: string;
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
    <AppPage>
      <AppPageHeader
        title="Applications"
        description="Track and manage your job applications with ease."
        action={
          <Link href="/applications/new" className={buttonVariants({ size: "sm" })}>
            Add application
          </Link>
        }
      />

      <ApplicationList
        applications={applications}
        query={params.q}
        status={status}
      />
    </AppPage>
  );
}
