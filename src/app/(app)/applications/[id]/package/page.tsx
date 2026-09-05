import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ApplicationPackageSection } from "@/components/applications/application-detail-sections";
import { AppPage, AppPageHeader } from "@/components/layout/app-page";
import { buttonVariants } from "@/components/ui/button";
import { getCoverLetters, getResumeVersions } from "@/lib/applications/packages";
import { getApplicationById } from "@/lib/applications/repository";
import { requireCurrentUser } from "@/lib/auth/current-user";

type ApplicationPackagePageProps = {
  params: Promise<{ id: string }>;
};

export default async function ApplicationPackagePage({
  params,
}: ApplicationPackagePageProps) {
  await requireCurrentUser();
  const { id } = await params;
  const application = await getApplicationById(id);

  if (!application) {
    notFound();
  }

  const [resumeVersions, coverLetters] = await Promise.all([
    getResumeVersions(id),
    getCoverLetters(id),
  ]);

  return (
    <AppPage size="wide">
      <AppPageHeader
        title={`${application.companyName} · ${application.jobTitle}`}
        description="Choose and preserve the exact resume and cover letter used for this application."
        action={
          <Link
            href={`/applications?id=${application.id}`}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <ArrowLeft aria-hidden />
            Back to application
          </Link>
        }
      />

      <ApplicationPackageSection
        applicationId={application.id}
        resumeVersions={resumeVersions}
        coverLetters={coverLetters}
        submittedResumeVersionId={application.submittedResumeVersionId}
        submittedCoverLetterId={application.submittedCoverLetterId}
      />
    </AppPage>
  );
}
