import { createApplication } from "@/app/(app)/applications/actions";
import { ApplicationForm } from "@/components/applications/application-form";
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
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 p-4 md:p-6 lg:p-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-medium tracking-tight">Add application</h1>
        <p className="text-muted-foreground">
          Capture the role details, status, source link, and notes.
        </p>
      </div>

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
        description="Status defaults to Saved until you submit or move the application forward."
        submitLabel="Create application"
        cancelHref="/applications"
      />
    </main>
  );
}
