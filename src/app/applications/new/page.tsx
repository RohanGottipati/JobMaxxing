import { AlertCircle } from "lucide-react";

import { createApplication } from "@/app/applications/actions";
import { ApplicationForm } from "@/components/applications/application-form";
import { Card, CardContent } from "@/components/ui/card";
import { requireCurrentUser } from "@/lib/auth/current-user";

type NewApplicationPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function NewApplicationPage({
  searchParams,
}: NewApplicationPageProps) {
  await requireCurrentUser();
  const params = await searchParams;

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-10">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">
          Add application
        </h1>
        <p className="mt-2 text-muted-foreground">
          Capture the role details, status, source link, and notes.
        </p>
      </div>

      {params.error ? (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="flex gap-3 pt-6 text-sm text-destructive">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            Company name and job title are required.
          </CardContent>
        </Card>
      ) : null}

      <ApplicationForm
        action={createApplication}
        title="Application details"
        description="Status defaults to Saved until you submit or move the application forward."
        submitLabel="Create application"
        cancelHref="/applications"
      />
    </main>
  );
}
