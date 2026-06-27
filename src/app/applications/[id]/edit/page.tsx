import { notFound } from "next/navigation";

import { updateApplication } from "@/app/applications/actions";
import { ApplicationForm } from "@/components/applications/application-form";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { getApplicationById } from "@/lib/applications/repository";

type EditApplicationPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditApplicationPage({
  params,
}: EditApplicationPageProps) {
  const user = await requireCurrentUser();
  const { id } = await params;
  const application = await getApplicationById(user.id, id);

  if (!application) {
    notFound();
  }

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-10">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">
          Edit application
        </h1>
        <p className="mt-2 text-muted-foreground">
          Update status, notes, and role details for this tracked job.
        </p>
      </div>

      <ApplicationForm
        action={updateApplication}
        application={application}
        title={`${application.companyName} · ${application.jobTitle}`}
        description="This placeholder form validates and redirects now; persistence comes with the Supabase adapter."
        submitLabel="Save changes"
        cancelHref={`/applications/${application.id}`}
      />
    </main>
  );
}
