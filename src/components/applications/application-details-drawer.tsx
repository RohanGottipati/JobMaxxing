"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Building2,
  CalendarDays,
  Clock,
  ExternalLink,
  FileText,
  Link2,
  MapPin,
  NotebookPen,
  Pencil,
  UserRound,
} from "lucide-react";

import { getApplicationDetails } from "@/app/(app)/applications/actions";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import type {
  CoverLetter,
  ResumeVersion,
} from "@/lib/applications/package-types";
import type { ApplicationDetails } from "@/lib/applications/types";
import {
  formatDate,
  formatDateTime,
  statusAccents,
  statusLabels,
} from "@/lib/applications/status";
import { cn } from "@/lib/utils";

type ApplicationDetailsDrawerProps = {
  applicationId: string | null;
  onOpenChange: (open: boolean) => void;
};

const TABS = [
  "Overview",
  "Job Description",
  "Resume Used",
  "Cover Letter Used",
  "Notes",
] as const;

type Tab = (typeof TABS)[number];

export function ApplicationDetailsDrawer({
  applicationId,
  onOpenChange,
}: ApplicationDetailsDrawerProps) {
  return (
    <Sheet open={applicationId !== null} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showCloseButton
        className="w-full gap-0 p-0 sm:max-w-xl"
      >
        {applicationId ? (
          <DrawerBody key={applicationId} applicationId={applicationId} />
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

/**
 * Mounted fresh per opened application (keyed by id), so loading state starts true and the
 * active tab resets without any synchronous setState inside an effect.
 */
function DrawerBody({ applicationId }: { applicationId: string }) {
  const [details, setDetails] = useState<ApplicationDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("Overview");

  useEffect(() => {
    let cancelled = false;

    getApplicationDetails(applicationId)
      .then((result) => {
        if (!cancelled) setDetails(result);
      })
      .catch(() => {
        if (!cancelled) setDetails(null);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [applicationId]);

  const application = details?.application ?? null;
  const submittedResume =
    details?.resumeVersions.find(
      (version) => version.id === application?.submittedResumeVersionId,
    ) ?? null;
  const submittedCoverLetter =
    details?.coverLetters.find(
      (letter) => letter.id === application?.submittedCoverLetterId,
    ) ?? null;

  if (isLoading || !application) {
    return <DrawerSkeleton loading={isLoading} />;
  }

  return (
    <>
            <SheetHeader className="gap-2 border-b border-border px-6 py-5 pr-14">
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant="outline"
                  className={cn("gap-1", statusAccents[application.status].badge)}
                >
                  <span
                    aria-hidden
                    className={cn(
                      "size-1.5 rounded-full",
                      statusAccents[application.status].dot,
                    )}
                  />
                  {statusLabels[application.status]}
                </Badge>
              </div>
              <SheetTitle className="text-xl leading-tight">
                {application.jobTitle}
              </SheetTitle>
              <SheetDescription className="flex items-center gap-1.5 text-sm">
                <Building2 aria-hidden className="size-4" />
                {application.companyName}
              </SheetDescription>

              <div className="mt-2 flex flex-wrap gap-2">
                {application.jobUrl ? (
                  <Link
                    href={application.jobUrl}
                    target="_blank"
                    rel="noreferrer"
                    className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                  >
                    <ExternalLink aria-hidden className="size-3.5" />
                    Job post
                  </Link>
                ) : null}
                <Link
                  href={`/applications/${application.id}`}
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                >
                  <FileText aria-hidden className="size-3.5" />
                  Full page
                </Link>
                <Link
                  href={`/applications/${application.id}/edit`}
                  className={cn(buttonVariants({ size: "sm" }))}
                >
                  <Pencil aria-hidden className="size-3.5" />
                  Edit
                </Link>
              </div>
            </SheetHeader>

            <nav
              aria-label="Application sections"
              className="flex gap-1 overflow-x-auto border-b border-border px-4"
            >
              {TABS.map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  aria-current={activeTab === tab ? "page" : undefined}
                  className={cn(
                    "relative whitespace-nowrap px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
                    activeTab === tab && "text-foreground",
                  )}
                >
                  {tab}
                  {activeTab === tab ? (
                    <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-foreground" />
                  ) : null}
                </button>
              ))}
            </nav>

            <div className="flex-1 overflow-y-auto px-6 py-5">
              {activeTab === "Overview" ? (
                <OverviewTab application={application} />
              ) : null}
              {activeTab === "Job Description" ? (
                <DocumentText
                  value={application.jobDescription}
                  emptyLabel="No job description saved for this role."
                />
              ) : null}
              {activeTab === "Resume Used" ? (
                <ResumeTab
                  submitted={submittedResume}
                  all={details?.resumeVersions ?? []}
                />
              ) : null}
              {activeTab === "Cover Letter Used" ? (
                <CoverLetterTab
                  submitted={submittedCoverLetter}
                  all={details?.coverLetters ?? []}
                />
              ) : null}
              {activeTab === "Notes" ? (
                <DocumentText
                  value={application.notes}
                  emptyLabel="No notes yet."
                />
              ) : null}
            </div>
    </>
  );
}

function OverviewTab({
  application,
}: {
  application: ApplicationDetails["application"];
}) {
  return (
    <div className="grid gap-5">
      <dl className="grid grid-cols-2 gap-3">
        <InfoTile
          icon={<MapPin className="size-4" />}
          label="Location"
          value={application.location ?? "Not set"}
        />
        <InfoTile
          icon={<CalendarDays className="size-4" />}
          label="Date applied"
          value={formatDate(application.appliedAt)}
        />
        <InfoTile
          icon={<Clock className="size-4" />}
          label="Deadline"
          value={formatDate(application.deadline)}
        />
        <InfoTile
          icon={<UserRound className="size-4" />}
          label="Referral / contact"
          value={application.referralContact ?? "Not set"}
        />
      </dl>

      {application.jobUrl ? (
        <div className="grid gap-1.5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Application link
          </p>
          <Link
            href={application.jobUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 break-all text-sm text-foreground underline-offset-4 hover:underline"
          >
            <Link2 aria-hidden className="size-4 shrink-0" />
            {application.jobUrl}
          </Link>
        </div>
      ) : null}

      {application.nextAction ? (
        <>
          <Separator />
          <Section title="Next action">
            <p className="text-sm leading-relaxed text-muted-foreground">
              {application.nextAction}
            </p>
          </Section>
        </>
      ) : null}

      <Separator />
      <p className="text-xs text-muted-foreground">
        Created {formatDateTime(application.createdAt)} · Updated{" "}
        {formatDateTime(application.updatedAt)}
      </p>
    </div>
  );
}

function ResumeTab({
  submitted,
  all,
}: {
  submitted: ResumeVersion | null;
  all: ResumeVersion[];
}) {
  return (
    <DocumentVersions
      submitted={
        submitted
          ? {
              heading: titleFor("Resume", submitted.version_number, submitted.title),
              submittedAt: submitted.submitted_at,
              content: submitted.content,
              filePath: submitted.file_path,
            }
          : null
      }
      others={all
        .filter((version) => version.id !== submitted?.id)
        .map((version) => ({
          id: version.id,
          heading: titleFor("Resume", version.version_number, version.title),
        }))}
      emptyLabel="No resume versions saved for this application yet."
      submittedEmptyLabel="No resume has been marked as submitted for this role yet."
    />
  );
}

function CoverLetterTab({
  submitted,
  all,
}: {
  submitted: CoverLetter | null;
  all: CoverLetter[];
}) {
  return (
    <DocumentVersions
      submitted={
        submitted
          ? {
              heading: titleFor("Cover letter", submitted.version_number, submitted.title),
              submittedAt: submitted.submitted_at,
              content: submitted.content,
              filePath: submitted.file_path,
            }
          : null
      }
      others={all
        .filter((letter) => letter.id !== submitted?.id)
        .map((letter) => ({
          id: letter.id,
          heading: titleFor("Cover letter", letter.version_number, letter.title),
        }))}
      emptyLabel="No cover letters saved for this application yet."
      submittedEmptyLabel="No cover letter has been marked as submitted for this role yet."
    />
  );
}

type SubmittedDoc = {
  heading: string;
  submittedAt: string | null;
  content: string | null;
  filePath: string | null;
};

function DocumentVersions({
  submitted,
  others,
  emptyLabel,
  submittedEmptyLabel,
}: {
  submitted: SubmittedDoc | null;
  others: { id: string; heading: string }[];
  emptyLabel: string;
  submittedEmptyLabel: string;
}) {
  const hasAny = submitted !== null || others.length > 0;

  if (!hasAny) {
    return <EmptyState>{emptyLabel}</EmptyState>;
  }

  return (
    <div className="grid gap-5">
      {submitted ? (
        <div className="grid gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className="border-emerald-500/40 text-emerald-600"
            >
              Submitted
            </Badge>
            <span className="text-sm font-medium">{submitted.heading}</span>
            {submitted.submittedAt ? (
              <span className="text-xs text-muted-foreground">
                {formatDateTime(submitted.submittedAt)}
              </span>
            ) : null}
          </div>
          {submitted.filePath ? (
            <FileAttachment filePath={submitted.filePath} />
          ) : null}
          <DocumentText
            value={submitted.content}
            emptyLabel="This version has no text content saved."
          />
        </div>
      ) : (
        <EmptyState>{submittedEmptyLabel}</EmptyState>
      )}

      {others.length ? (
        <div className="grid gap-2">
          <Separator />
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Other versions
          </p>
          <ul className="grid gap-1.5">
            {others.map((item) => (
              <li
                key={item.id}
                className="rounded-md border border-border/70 px-3 py-2 text-sm text-muted-foreground"
              >
                {item.heading}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function FileAttachment({ filePath }: { filePath: string }) {
  const fileName = filePath.split("/").pop() || filePath;
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/40 px-3 py-2">
      <span className="flex min-w-0 items-center gap-2 text-sm">
        <FileText aria-hidden className="size-4 shrink-0 text-muted-foreground" />
        <span className="truncate">{fileName}</span>
      </span>
      <Badge variant="secondary" className="shrink-0">
        File
      </Badge>
    </div>
  );
}

function DocumentText({
  value,
  emptyLabel,
}: {
  value: string | null;
  emptyLabel: string;
}) {
  if (!value?.trim()) {
    return <EmptyState>{emptyLabel}</EmptyState>;
  }
  return (
    <div className="rounded-lg border border-border bg-muted/20 p-4">
      <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
        {value}
      </p>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-1.5">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
      {children}
    </div>
  );
}

function InfoTile({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="grid gap-1 rounded-lg border border-border p-3">
      <span className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-center rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
      <span className="flex flex-col items-center gap-2">
        <NotebookPen aria-hidden className="size-5 opacity-50" />
        {children}
      </span>
    </div>
  );
}

function titleFor(prefix: string, versionNumber: number, title: string | null) {
  return `${prefix} v${versionNumber}${title ? ` · ${title}` : ""}`;
}

function DrawerSkeleton({ loading }: { loading: boolean }) {
  return (
    <div aria-busy={loading} className="grid gap-5 p-6">
      <Skeleton className="h-5 w-24 rounded-full" />
      <Skeleton className="h-7 w-3/4" />
      <Skeleton className="h-5 w-1/2" />
      <div className="flex gap-2">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-8 w-24" />
      </div>
      <Skeleton className="h-px w-full" />
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-16 w-full rounded-lg" />
        <Skeleton className="h-16 w-full rounded-lg" />
        <Skeleton className="h-16 w-full rounded-lg" />
        <Skeleton className="h-16 w-full rounded-lg" />
      </div>
      <Skeleton className="h-32 w-full rounded-lg" />
    </div>
  );
}
