"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  Link2,
  MapPin,
  MessageSquareText,
  NotebookPen,
  Pencil,
  UserRound,
} from "lucide-react";

import { getApplicationDetails } from "@/app/(app)/applications/actions";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { JobApplication } from "@/lib/applications/types";
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

type ApplicationDetails = Awaited<ReturnType<typeof getApplicationDetails>>;

type DocumentItem = {
  id: string;
  version_number: number;
  title: string | null;
  submitted_at: string | null;
  file_path?: string | null;
  content?: string | null;
};

const TABS = ["Overview", "Job Description", "Resume", "Cover Letter", "Notes"];

function safeFormatDate(value: string | null | undefined) {
  if (!value || !Number.isFinite(new Date(value).getTime())) {
    return null;
  }

  return formatDate(value);
}

function safeFormatDateTime(value: string | null | undefined) {
  if (!value || !Number.isFinite(new Date(value).getTime())) {
    return null;
  }

  return formatDateTime(value);
}

export function ApplicationDetailsDrawer({
  applicationId,
  onOpenChange,
}: ApplicationDetailsDrawerProps) {
  return (
    <Dialog open={applicationId !== null} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className="h-[min(92dvh,760px)] w-[min(96vw,940px)] max-w-none overflow-hidden rounded-xl border-border-strong bg-popover p-0 text-popover-foreground shadow-[0_18px_56px_-24px_rgb(0_0_0/0.4)]"
      >
        {applicationId ? (
          <ModalBody key={applicationId} applicationId={applicationId} />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function ModalBody({ applicationId }: { applicationId: string }) {
  const [details, setDetails] = useState<ApplicationDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    // This modal intentionally resets local load state whenever a new card id opens.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDetails(null);
    setError(null);
    setIsLoading(true);

    getApplicationDetails(applicationId)
      .then((nextDetails) => {
        if (!cancelled) {
          setDetails(nextDetails);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError("Unable to load this application.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [applicationId]);

  if (isLoading) {
    return <ModalSkeleton />;
  }

  if (error || !details) {
    return (
      <div className="grid h-full place-items-center p-8">
        <div className="max-w-sm text-center">
          <h2 className="text-lg font-semibold">
            Application unavailable
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {error ?? "This application could not be loaded."}
          </p>
        </div>
      </div>
    );
  }

  const { application, coverLetters, resumeVersions } = details;
  const submittedResume =
    resumeVersions.find(
      (version) => version.id === application.submittedResumeVersionId,
    ) ?? null;
  const submittedCoverLetter =
    coverLetters.find(
      (letter) => letter.id === application.submittedCoverLetterId,
    ) ?? null;
  const deadlineLabel = safeFormatDate(application.deadline);

  return (
    <div className="grid h-full min-h-0 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <main className="min-h-0 overflow-y-auto">
        <DialogHeader className="border-b border-border bg-parchment/35 px-5 py-5 pr-14 text-left sm:px-6">
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className={cn(
                "gap-1 bg-background/70",
                statusAccents[application.status].badge,
              )}
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
            {deadlineLabel ? (
              <Badge
                variant="outline"
                className="gap-1 border-warning/40 bg-warning/10 text-warning"
              >
                <Clock aria-hidden className="size-3" />
                Due {deadlineLabel}
              </Badge>
            ) : null}
          </div>

          <DialogTitle className="max-w-3xl text-2xl leading-tight font-semibold tracking-[-0.035em] sm:text-3xl">
            {application.jobTitle}
          </DialogTitle>
          <DialogDescription className="flex items-center gap-2 text-base">
            <Building2 aria-hidden className="size-4" />
            {application.companyName}
          </DialogDescription>

          <div className="flex flex-wrap gap-2 pt-2">
            {application.jobUrl ? (
              <Link
                href={application.jobUrl}
                target="_blank"
                rel="noreferrer"
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                <ExternalLink aria-hidden className="size-3.5" />
                Job post
              </Link>
            ) : null}
            <Link
              href={`/applications/${application.id}`}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              <FileText aria-hidden className="size-3.5" />
              Full page
            </Link>
            <Link
              href={`/applications/${application.id}/edit`}
              className={buttonVariants({ size: "sm" })}
            >
              <Pencil aria-hidden className="size-3.5" />
              Edit
            </Link>
          </div>
        </DialogHeader>

        <Tabs defaultValue="Overview" className="px-5 py-4 sm:px-6">
          <TabsList className="h-auto w-full justify-start overflow-x-auto rounded-md border border-border bg-parchment p-1">
            {TABS.map((tab) => (
              <TabsTrigger
                key={tab}
                value={tab}
                className="flex-none px-3 py-2 text-sm font-medium"
              >
                {tab}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="Overview" className="mt-4">
            <OverviewTab application={application} />
          </TabsContent>
          <TabsContent value="Job Description" className="mt-4">
            <DocumentText
              value={application.jobDescription}
              emptyLabel="No job description saved for this role."
            />
          </TabsContent>
          <TabsContent value="Resume" className="mt-4">
            <DocumentVersions
              heading="Resume versions"
              submitted={submittedResume}
              items={resumeVersions}
              emptyLabel="No resume versions yet."
              submittedEmptyLabel="No submitted resume selected."
            />
          </TabsContent>
          <TabsContent value="Cover Letter" className="mt-4">
            <DocumentVersions
              heading="Cover letters"
              submitted={submittedCoverLetter}
              items={coverLetters}
              emptyLabel="No cover letters yet."
              submittedEmptyLabel="No submitted cover letter selected."
            />
          </TabsContent>
          <TabsContent value="Notes" className="mt-4">
            <DocumentText value={application.notes} emptyLabel="No notes yet." />
          </TabsContent>
        </Tabs>
      </main>

      <aside className="surface-grid-sm min-h-0 overflow-y-auto border-t border-border bg-parchment/55 p-5 lg:border-t-0 lg:border-l">
        <ActivityPanel
          application={application}
          submittedCoverLetter={submittedCoverLetter}
          submittedResume={submittedResume}
        />
      </aside>
    </div>
  );
}

function OverviewTab({ application }: { application: JobApplication }) {
  const appliedLabel = safeFormatDate(application.appliedAt);
  const createdLabel = safeFormatDateTime(application.createdAt) ?? "Unknown";
  const updatedLabel = safeFormatDateTime(application.updatedAt) ?? "Unknown";

  return (
    <div className="grid gap-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <InfoTile
          icon={<MapPin className="size-4" />}
          label="Location"
          value={application.location}
        />
        <InfoTile
          icon={<CalendarDays className="size-4" />}
          label="Applied"
          value={appliedLabel}
        />
        <InfoTile
          icon={<Clock className="size-4" />}
          label="Next action"
          value={application.nextAction}
        />
        <InfoTile
          icon={<UserRound className="size-4" />}
          label="Referral"
          value={application.referralContact}
        />
      </div>

      {application.jobUrl ? (
        <div className="rounded-lg border border-border bg-elevated p-4">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <Link2 aria-hidden className="size-4" />
            Source
          </p>
          <Link
            href={application.jobUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-2 block truncate text-sm text-primary underline-offset-4 hover:underline"
          >
            {application.jobUrl}
          </Link>
        </div>
      ) : null}

      <div className="rounded-lg border border-border bg-elevated p-4">
        <p className="text-sm font-semibold">Timeline</p>
        <Separator className="my-3" />
        <p className="text-sm text-muted-foreground">
          Created {createdLabel}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Updated {updatedLabel}
        </p>
      </div>
    </div>
  );
}

function ActivityPanel({
  application,
  submittedCoverLetter,
  submittedResume,
}: {
  application: JobApplication;
  submittedCoverLetter: DocumentItem | null;
  submittedResume: DocumentItem | null;
}) {
  return (
    <div className="grid gap-5">
      <div className="flex items-center gap-3">
        <MessageSquareText aria-hidden className="size-5 text-muted-foreground" />
        <h3 className="text-base font-semibold">Activity</h3>
      </div>

      <div className="grid gap-4">
        <ActivityEntry
          initials={initialsFor(application.companyName)}
          title={`Added ${application.companyName} to ${statusLabels[application.status]}`}
          time={safeFormatDateTime(application.createdAt) ?? "Unknown"}
        />
        <ActivityEntry
          initials="JM"
          title="Updated application details"
          time={safeFormatDateTime(application.updatedAt) ?? "Unknown"}
        />
        {submittedResume ? (
          <ActivityEntry
            initials="RS"
            title={`Submitted resume v${submittedResume.version_number}`}
            time={
              safeFormatDateTime(submittedResume.submitted_at) ??
              "Marked as submitted"
            }
          />
        ) : null}
        {submittedCoverLetter ? (
          <ActivityEntry
            initials="CL"
            title={`Submitted cover letter v${submittedCoverLetter.version_number}`}
            time={
              safeFormatDateTime(submittedCoverLetter.submitted_at) ??
              "Marked as submitted"
            }
          />
        ) : null}
      </div>

      {application.notes ? (
        <div className="rounded-lg border border-border bg-elevated p-4">
          <p className="text-sm font-semibold">Latest note</p>
          <p className="mt-2 line-clamp-5 text-sm leading-6 text-muted-foreground">
            {application.notes}
          </p>
        </div>
      ) : null}
    </div>
  );
}

function ActivityEntry({
  initials,
  time,
  title,
}: {
  initials: string;
  time: string;
  title: string;
}) {
  return (
    <div className="flex gap-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/15 text-xs font-bold text-primary">
        {initials}
      </span>
      <div className="min-w-0">
        <p className="text-sm font-semibold leading-5">{title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{time}</p>
      </div>
    </div>
  );
}

function DocumentVersions({
  emptyLabel,
  heading,
  items,
  submitted,
  submittedEmptyLabel,
}: {
  emptyLabel: string;
  heading: string;
  items: DocumentItem[];
  submitted: DocumentItem | null;
  submittedEmptyLabel: string;
}) {
  return (
    <div className="grid gap-5">
      <section className="rounded-lg border border-border bg-elevated p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold">Submitted</p>
          {submitted ? (
            <Badge
              variant="outline"
              className="gap-1 border-success/40 bg-success/10 text-success"
            >
              <CheckCircle2 aria-hidden className="size-3" />
              Submitted
            </Badge>
          ) : null}
        </div>

        {submitted ? (
          <div className="mt-3 grid gap-3">
            <DocumentHeader item={submitted} />
            <FileAttachment filePath={submitted.file_path ?? null} />
            <DocumentText
              value={submitted.content ?? null}
              emptyLabel="This version has no text content saved."
            />
          </div>
        ) : (
          <EmptyState>{submittedEmptyLabel}</EmptyState>
        )}
      </section>

      <section className="rounded-lg border border-border bg-elevated p-4">
        <p className="text-sm font-semibold">{heading}</p>
        {items.length ? (
          <ul className="mt-3 grid gap-2">
            {items.map((item) => (
              <li
                key={item.id}
                className="rounded-md border border-border bg-parchment/45 p-3"
              >
                <DocumentHeader item={item} />
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState>{emptyLabel}</EmptyState>
        )}
      </section>
    </div>
  );
}

function DocumentHeader({ item }: { item: DocumentItem }) {
  const submittedLabel = safeFormatDate(item.submitted_at);

  return (
    <div className="flex items-center justify-between gap-3">
      <p className="min-w-0 truncate text-sm font-medium">
        Version {item.version_number}
        {item.title ? ` · ${item.title}` : ""}
      </p>
      {submittedLabel ? (
        <span className="shrink-0 text-xs text-muted-foreground">
          {submittedLabel}
        </span>
      ) : null}
    </div>
  );
}

function FileAttachment({ filePath }: { filePath: string | null }) {
  if (!filePath) {
    return null;
  }

  const fileName = filePath.split("/").filter(Boolean).at(-1) ?? "Attachment";

  return (
    <p className="flex items-center gap-2 rounded-md border border-border bg-parchment/45 px-3 py-2 text-sm">
      <FileText aria-hidden className="size-4 shrink-0 text-muted-foreground" />
      <span className="min-w-0 truncate">{fileName}</span>
      <Badge variant="secondary" className="ml-auto shrink-0">
        File
      </Badge>
    </p>
  );
}

function DocumentText({
  emptyLabel,
  value,
}: {
  emptyLabel: string;
  value: string | null;
}) {
  if (!value) {
    return <EmptyState>{emptyLabel}</EmptyState>;
  }

  return (
    <div className="paper-rule max-h-[28rem] overflow-y-auto whitespace-pre-wrap rounded-lg border border-border bg-parchment/40 p-4 text-sm leading-8 text-muted-foreground">
      {value}
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
  value: string | null;
}) {
  return (
    <div className="rounded-lg border border-border bg-elevated p-4">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </p>
      <p className="mt-2 min-h-5 text-sm font-medium">
        {value || "Not set"}
      </p>
    </div>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="surface-grid-sm mt-3 grid place-items-center rounded-lg border border-dashed border-border-strong bg-parchment/35 px-4 py-8 text-center text-sm text-muted-foreground">
      <NotebookPen aria-hidden className="mb-2 size-5 opacity-60" />
      {children}
    </div>
  );
}

function ModalSkeleton() {
  return (
    <div className="grid h-full min-h-0 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="space-y-5 p-6">
        <Skeleton className="h-6 w-28" />
        <Skeleton className="h-10 w-3/4" />
        <Skeleton className="h-5 w-48" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-20" />
        </div>
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
      <div className="surface-grid-sm space-y-4 border-t border-border bg-parchment/55 p-4 lg:border-t-0 lg:border-l">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-28 w-full" />
      </div>
    </div>
  );
}

function initialsFor(value: string) {
  const initials = value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return initials || "JM";
}
