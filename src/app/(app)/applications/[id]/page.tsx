import Link from "next/link";
import { notFound } from "next/navigation";

import { deleteApplication } from "@/app/(app)/applications/actions";
import { ApplicationPackageSection } from "@/components/applications/application-detail-sections";
import { StatusBadge } from "@/components/applications/status-badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { requireCurrentUser } from "@/lib/auth/current-user";
import {
  getCoverLetters,
  getResumeVersions,
} from "@/lib/applications/packages";
import { getApplicationById } from "@/lib/applications/repository";
import { formatDate, formatDateTime } from "@/lib/applications/status";

type ApplicationDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ApplicationDetailPage({
  params,
}: ApplicationDetailPageProps) {
  await requireCurrentUser();
  const { id } = await params;
  const application = await getApplicationById(id);

  if (!application) {
    notFound();
  }

  const [resumeVersions, coverLetters] = await Promise.all([
    getResumeVersions(application.id),
    getCoverLetters(application.id),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 p-4 md:p-6 lg:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <Link
            href="/applications"
            className="mb-4 inline-block text-sm text-muted-foreground underline underline-offset-4"
          >
            Applications
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-medium tracking-tight">
              {application.companyName}
            </h1>
            <StatusBadge status={application.status} />
          </div>
          <p className="mt-2 text-lg text-muted-foreground">
            {application.jobTitle}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {application.jobUrl ? (
            <Link
              href={application.jobUrl}
              className={buttonVariants({ variant: "outline" })}
              target="_blank"
              rel="noreferrer"
            >
              Job post
            </Link>
          ) : null}
          <Link
            href={`/applications/${application.id}/edit`}
            className={buttonVariants()}
          >
            Edit
          </Link>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Role details</CardTitle>
              <CardDescription>
                The core information you are tracking for this role.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <InfoItem
                  label="Location"
                  value={application.location ?? "Not set"}
                />
                <InfoItem
                  label="Application date"
                  value={formatDate(application.appliedAt)}
                />
                <InfoItem
                  label="Deadline"
                  value={formatDate(application.deadline)}
                />
                <InfoItem
                  label="Created"
                  value={formatDateTime(application.createdAt)}
                />
              </div>

              <Separator />

              <TextBlock
                title="Job description"
                value={application.jobDescription}
              />
              <TextBlock title="Notes" value={application.notes} />
            </CardContent>
          </Card>

          <ApplicationPackageSection
            applicationId={application.id}
            resumeVersions={resumeVersions}
            coverLetters={coverLetters}
            submittedResumeVersionId={application.submittedResumeVersionId}
            submittedCoverLetterId={application.submittedCoverLetterId}
          />
        </div>

        <div className="grid content-start gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Danger zone</CardTitle>
              <CardDescription>
                Permanently delete this application and all of its versions.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form action={deleteApplication}>
                <input
                  type="hidden"
                  name="application_id"
                  value={application.id}
                />
                <Button type="submit" variant="destructive" className="w-full">
                  Delete application
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-sm font-medium">{value}</p>
    </div>
  );
}

function TextBlock({ title, value }: { title: string; value: string | null }) {
  return (
    <div className="grid gap-2">
      <p className="text-sm font-medium">{title}</p>
      <div className="min-h-20 rounded-lg border border-border p-3 text-sm leading-6 text-muted-foreground">
        {value || "Not added yet."}
      </div>
    </div>
  );
}
