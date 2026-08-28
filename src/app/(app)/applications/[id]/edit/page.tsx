import { notFound } from "next/navigation";

import { updateApplication } from "@/app/(app)/applications/actions";
import { ApplicationForm } from "@/components/applications/application-form";
import { AppPage, AppPageHeader } from "@/components/layout/app-page";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { getApplicationById } from "@/lib/applications/repository";

type EditApplicationPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditApplicationPage({
  params,
}: EditApplicationPageProps) {
  await requireCurrentUser();
  const { id } = await params;
  const application = await getApplicationById(id);

  if (!application) {
    notFound();
  }

  return (
    <AppPage size="form">
      <AppPageHeader
        title="Edit application"
        description="Update the details for this job application."
      />

      <ApplicationForm
        action={updateApplication}
        application={application}
        title={`${application.companyName} · ${application.jobTitle}`}
        description="Make any necessary changes to keep your application data current."
        submitLabel="Save changes"
        cancelHref={`/applications/${application.id}`}
      />
    </AppPage>
  );
}
