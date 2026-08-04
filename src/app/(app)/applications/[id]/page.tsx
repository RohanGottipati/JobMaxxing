import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  CalendarClock,
  CheckCircle2,
  CircleDashed,
  ExternalLink,
  FileCheck2,
  FileText,
  GitCompareArrows,
  MapPin,
  Pencil,
  Trash2,
  UserRound,
} from "lucide-react";

import { deleteApplication } from "@/app/(app)/applications/actions";
import { ApplicationPackageSection } from "@/components/applications/application-detail-sections";
import { StatusBadge } from "@/components/applications/status-badge";
import { AppPage } from "@/components/layout/app-page";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { buttonVariants, Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { SubmitButton } from "@/components/ui/submit-button";
import { requireCurrentUser } from "@/lib/auth/current-user";
import {
  getCoverLetters,
  getResumeVersions,
} from "@/lib/applications/packages";
import { getApplicationById } from "@/lib/applications/repository";
import { formatDate, formatDateTime } from "@/lib/applications/status";
import { cn } from "@/lib/utils";

type ApplicationDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ApplicationDetailPage({
  params,
}: ApplicationDetailPageProps) {
  await requireCurrentUser();
  const { id } = await params;
  const application = await getApplicationById(id);

  if (!application) notFound();

  const [resumeVersions, coverLetters] = await Promise.all([
    getResumeVersions(application.id),
    getCoverLetters(application.id),
  ]);
  const hasResume = Boolean(application.submittedResumeVersionId);
  const hasCoverLetter = Boolean(application.submittedCoverLetterId);
  const packageCount = Number(hasResume) + Number(hasCoverLetter);

  return (
    <AppPage>
      <header className="grid gap-4">
        <Link
          href="/applications"
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "-ml-2 w-fit text-muted-foreground",
          )}
        >
          <ArrowLeft aria-hidden />
          Back to applications
        </Link>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-3.5">
            <span className="grid size-11 shrink-0 place-items-center rounded-md border border-border-strong bg-card text-base font-semibold text-primary shadow-paper">
              {application.companyName.slice(0, 1).toUpperCase()}
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={application.status} />
                {application.deadline ? (
                  <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                    <CalendarClock aria-hidden className="size-3.5" />
                    Due {formatDate(application.deadline)}
                  </span>
                ) : null}
              </div>
              <h1 className="mt-2 text-2xl font-semibold tracking-[-0.035em] text-balance sm:text-3xl">
                {application.jobTitle}
              </h1>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                <Building2 aria-hidden className="size-4" />
                {application.companyName}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap gap-2">
            {application.jobUrl ? (
              <Link
                href={application.jobUrl}
                className={buttonVariants({ variant: "outline" })}
                target="_blank"
                rel="noreferrer"
              >
                <ExternalLink aria-hidden />
                Job post
              </Link>
            ) : null}
            <Link
              href={`/applications/${application.id}/match`}
              className={buttonVariants({ variant: "outline" })}
            >
              <GitCompareArrows aria-hidden />
              Career match
            </Link>
            <Link
              href={`/applications/${application.id}/edit`}
              className={buttonVariants()}
            >
              <Pencil aria-hidden />
              Edit application
            </Link>
          </div>
        </div>
      </header>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(18rem,0.55fr)]">
        <div className="grid min-w-0 content-start gap-5">
          <Card>
            <CardHeader className="border-b border-border bg-parchment/35">
              <CardTitle>Role overview</CardTitle>
              <CardDescription>
                The key context and timing for this opportunity.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-5">
              {application.nextAction ? (
                <div className="flex gap-3 rounded-lg border border-primary/20 bg-primary/[0.06] p-4">
                  <span className="grid size-8 shrink-0 place-items-center rounded-md bg-primary/12 text-primary">
                    <CheckCircle2 aria-hidden className="size-4.5" />
                  </span>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                      Next action
                    </p>
                    <p className="mt-1 text-sm font-medium leading-6">
                      {application.nextAction}
                    </p>
                  </div>
                </div>
              ) : null}

              <div className="grid gap-3 sm:grid-cols-2">
                <InfoItem
                  icon={<MapPin aria-hidden />}
                  label="Location"
                  value={application.location ?? "Not set"}
                />
                <InfoItem
                  icon={<CalendarClock aria-hidden />}
                  label="Application date"
                  value={formatDate(application.appliedAt)}
                />
                <InfoItem
                  icon={<CalendarClock aria-hidden />}
                  label="Deadline"
                  value={formatDate(application.deadline)}
                />
                <InfoItem
                  icon={<UserRound aria-hidden />}
                  label="Referral contact"
                  value={application.referralContact ?? "Not set"}
                />
              </div>

              <Separator />

              <TextBlock
                icon={<FileText aria-hidden />}
                title="Job description"
                value={application.jobDescription}
              />
              <TextBlock
                icon={<FileCheck2 aria-hidden />}
                title="Notes"
                value={application.notes}
              />
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

        <aside className="grid content-start gap-5">
          <Card>
            <CardHeader>
              <CardTitle>Package readiness</CardTitle>
              <CardDescription>
                {packageCount} of 2 submitted documents selected
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <Progress value={packageCount * 50} />
              <div className="grid gap-2">
                <ChecklistRow
                  complete={hasResume}
                  label="Submitted resume"
                  href="/resumes?tab=tailored"
                />
                <ChecklistRow
                  complete={hasCoverLetter}
                  label="Submitted cover letter"
                  href="/cover-letters"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Activity</CardTitle>
              <CardDescription>History for this opportunity.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <TimelineItem label="Last updated" value={formatDateTime(application.updatedAt)} />
              <TimelineItem label="Application created" value={formatDateTime(application.createdAt)} />
            </CardContent>
          </Card>

          <Card className="border-destructive/25">
            <CardHeader>
              <CardTitle>Danger zone</CardTitle>
              <CardDescription>
                Delete this application and every document version tied to it.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="w-full">
                    <Trash2 aria-hidden />
                    Delete application
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete this application?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This permanently removes {application.jobTitle} at {application.companyName}, including its resume and cover-letter versions. This cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <form action={deleteApplication}>
                      <input type="hidden" name="application_id" value={application.id} />
                      <SubmitButton
                        type="submit"
                        variant="destructive"
                        className="w-full"
                        pendingLabel="Deleting…"
                      >
                        Delete permanently
                      </SubmitButton>
                    </form>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        </aside>
      </div>
    </AppPage>
  );
}

function InfoItem({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex gap-3 rounded-lg border border-border bg-parchment/45 p-3.5">
      <span className="mt-0.5 text-muted-foreground [&_svg]:size-4">{icon}</span>
      <div className="min-w-0">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="mt-1 break-words text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}

function TextBlock({
  icon,
  title,
  value,
}: {
  icon: ReactNode;
  title: string;
  value: string | null;
}) {
  return (
    <section className="grid gap-2.5">
      <h2 className="flex items-center gap-2 text-sm font-semibold [&_svg]:size-4 [&_svg]:text-muted-foreground">
        {icon}
        {title}
      </h2>
      <div className="paper-rule min-h-24 whitespace-pre-wrap rounded-lg border border-border bg-parchment/40 p-4 text-sm leading-8 text-muted-foreground">
        {value || "Not added yet."}
      </div>
    </section>
  );
}

function ChecklistRow({
  complete,
  href,
  label,
}: {
  complete: boolean;
  href: string;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2.5 rounded-lg p-2 text-sm transition-colors hover:bg-muted"
    >
      {complete ? (
        <CheckCircle2 aria-hidden className="size-4 text-success" />
      ) : (
        <CircleDashed aria-hidden className="size-4 text-muted-foreground" />
      )}
      <span className="flex-1">{label}</span>
      <span className="text-xs text-muted-foreground">
        {complete ? "Ready" : "Missing"}
      </span>
    </Link>
  );
}

function TimelineItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="relative pl-5 before:absolute before:left-0 before:top-1.5 before:size-2 before:rounded-full before:bg-primary/70 after:absolute after:bottom-[-1.25rem] after:left-[0.218rem] after:top-4 after:w-px after:bg-border last:after:hidden">
      <p className="text-sm font-medium">{label}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{value}</p>
    </div>
  );
}
