import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { getApplications } from "@/lib/applications/repository";
import { parseApplicationStatus } from "@/lib/applications/status";

import { ApplicationList } from "@/components/applications/application-list";
import { PlaceholderNotice } from "@/components/applications/placeholder-notice";

type ApplicationsPageProps = {
  searchParams: Promise<{
    q?: string;
    status?: string;
    placeholder?: string;
  }>;
};

export default async function ApplicationsPage({
  searchParams,
}: ApplicationsPageProps) {
  const user = await requireCurrentUser();
  const params = await searchParams;
  const status = parseApplicationStatus(params.status) ?? "all";
  const applications = await getApplications(user.id, {
    query: params.q,
    status,
  });

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 p-4 md:p-6 lg:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-medium tracking-tight">Applications</h1>
          <p className="max-w-2xl text-muted-foreground">
            Search and filter your tracked jobs by company, title, and status.
          </p>
        </div>
        <Link href="/applications/new" className={buttonVariants()}>
          Add application
        </Link>
      </div>

      <PlaceholderNotice value={params.placeholder} />

      <ApplicationList
        applications={applications}
        query={params.q}
        status={status}
      />
    </main>
  );
}
