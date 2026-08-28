import { createApplication } from "@/app/(app)/applications/actions";
import { ApplicationForm } from "@/components/applications/application-form";
import { AppPage, AppPageHeader } from "@/components/layout/app-page";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { parseApplicationStatus } from "@/lib/applications/status";

type NewApplicationPageProps = {
  searchParams: Promise<{ error?: string; status?: string }>;
};

export default async function NewApplicationPage({
  searchParams,
}: NewApplicationPageProps) {
  await requireCurrentUser();
  const params = await searchParams;
  const defaultStatus = parseApplicationStatus(params.status) ?? "saved";

  return (
    <AppPage size="form">
      <AppPageHeader
        title="Add application"
        description="Add a new job application with all the essential details."
      />

      {params.error ? (
        <Alert variant="destructive">
          <AlertDescription>
            Company name and job title are required.
          </AlertDescription>
        </Alert>
      ) : null}

      <ApplicationForm
        action={createApplication}
        defaultStatus={defaultStatus}
        title="Application details"
        description="Add the essential information for tracking this opportunity."
        submitLabel="Create application"
        cancelHref="/applications"
      />
    </AppPage>
  );
}
