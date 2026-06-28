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
        className="h-[min(90dvh,700px)] w-[min(94vw,900px)] max-w-none overflow-hidden border-zinc-700 bg-zinc-900 p-0 text-zinc-100 shadow-2xl shadow-black/60"
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
          <h2 className="text-lg font-semibold text-zinc-100">
            Application unavailable
          </h2>
          <p className="mt-2 text-sm text-zinc-400">
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
        <DialogHeader className="border-b border-zinc-700/70 px-5 py-4 pr-14 text-left">
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className={cn(
                "gap-1 border-zinc-600 bg-zinc-950/70 text-zinc-200",
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
                className="gap-1 border-amber-500/40 bg-amber-500/10 text-amber-200"
              >
                <Clock aria-hidden className="size-3" />
                Due {deadlineLabel}
              </Badge>
            ) : null}
          </div>

          <DialogTitle className="max-w-3xl text-3xl leading-tight font-bold text-zinc-100">
            {application.jobTitle}
          </DialogTitle>
          <DialogDescription className="flex items-center gap-2 text-base text-zinc-400">
            <Building2 aria-hidden className="size-4" />
            {application.companyName}
          </DialogDescription>

          <div className="flex flex-wrap gap-2 pt-2">
            {application.jobUrl ? (
              <Link
                href={application.jobUrl}
                target="_blank"
                rel="noreferrer"
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                  "border-zinc-700 bg-zinc-950/70 text-zinc-200 hover:bg-zinc-800",
                )}
              >
                <ExternalLink aria-hidden className="size-3.5" />
                Job post
              </Link>
            ) : null}
            <Link
              href={`/applications/${application.id}`}
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "border-zinc-700 bg-zinc-950/70 text-zinc-200 hover:bg-zinc-800",
              )}
            >
              <FileText aria-hidden className="size-3.5" />
              Full page
            </Link>
            <Link
              href={`/applications/${application.id}/edit`}
              className={cn(buttonVariants({ size: "sm" }), "bg-sky-600 text-white hover:bg-sky-500")}
            >
              <Pencil aria-hidden className="size-3.5" />
              Edit
            </Link>
          </div>
        </DialogHeader>

        <Tabs defaultValue="Overview" className="px-5 py-4">
          <TabsList className="h-auto w-full justify-start overflow-x-auto rounded-lg bg-zinc-950/70 p-1">
            {TABS.map((tab) => (
              <TabsTrigger
                key={tab}
                value={tab}
                className="flex-none px-3 py-2 text-sm font-medium text-zinc-400 data-active:bg-zinc-800 data-active:text-zinc-100"
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

      <aside className="min-h-0 overflow-y-auto border-t border-zinc-700/70 bg-zinc-950/70 p-4 lg:border-t-0 lg:border-l">
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
        <div className="rounded-lg border border-zinc-700 bg-zinc-950/50 p-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-zinc-200">
            <Link2 aria-hidden className="size-4" />
            Source
          </p>
          <Link
            href={application.jobUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-2 block truncate text-sm text-sky-300 underline-offset-4 hover:underline"
          >
            {application.jobUrl}
          </Link>
        </div>
      ) : null}

      <div className="rounded-lg border border-zinc-700 bg-zinc-950/50 p-4">
        <p className="text-sm font-semibold text-zinc-200">Timeline</p>
        <Separator className="my-3 bg-zinc-800" />
        <p className="text-sm text-zinc-400">
          Created {createdLabel}
        </p>
        <p className="mt-1 text-sm text-zinc-400">
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
        <MessageSquareText aria-hidden className="size-5 text-zinc-400" />
        <h3 className="text-base font-bold text-zinc-100">Activity</h3>
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
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/70 p-4">
          <p className="text-sm font-semibold text-zinc-200">Latest note</p>
          <p className="mt-2 line-clamp-5 text-sm leading-6 text-zinc-400">
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
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-cyan-500 text-xs font-bold text-zinc-950">
        {initials}
      </span>
      <div className="min-w-0">
        <p className="text-sm font-semibold leading-5 text-zinc-200">{title}</p>
        <p className="mt-0.5 text-xs text-sky-300">{time}</p>
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
      <section className="rounded-lg border border-zinc-700 bg-zinc-950/50 p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-zinc-200">Submitted</p>
          {submitted ? (
            <Badge
              variant="outline"
              className="gap-1 border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
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

      <section className="rounded-lg border border-zinc-700 bg-zinc-950/50 p-4">
        <p className="text-sm font-semibold text-zinc-200">{heading}</p>
        {items.length ? (
          <ul className="mt-3 grid gap-2">
            {items.map((item) => (
              <li
                key={item.id}
                className="rounded-lg border border-zinc-800 bg-zinc-900/70 p-3"
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
      <p className="min-w-0 truncate text-sm font-medium text-zinc-200">
        Version {item.version_number}
        {item.title ? ` · ${item.title}` : ""}
      </p>
      {submittedLabel ? (
        <span className="shrink-0 text-xs text-zinc-500">
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
    <p className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/70 px-3 py-2 text-sm text-zinc-300">
      <FileText aria-hidden className="size-4 shrink-0 text-zinc-500" />
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
    <div className="max-h-[28rem] overflow-y-auto whitespace-pre-wrap rounded-lg border border-zinc-800 bg-zinc-950/60 p-4 text-sm leading-6 text-zinc-300">
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
    <div className="rounded-lg border border-zinc-700 bg-zinc-950/50 p-4">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase text-zinc-500">
        {icon}
        {label}
      </p>
      <p className="mt-2 min-h-5 text-sm font-medium text-zinc-200">
        {value || "Not set"}
      </p>
    </div>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-3 grid place-items-center rounded-lg border border-dashed border-zinc-800 bg-zinc-950/50 px-4 py-8 text-center text-sm text-zinc-500">
      <NotebookPen aria-hidden className="mb-2 size-5 opacity-60" />
      {children}
    </div>
  );
}

function ModalSkeleton() {
  return (
    <div className="grid h-full min-h-0 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="space-y-5 p-6">
        <Skeleton className="h-6 w-28 bg-zinc-800" />
        <Skeleton className="h-10 w-3/4 bg-zinc-800" />
        <Skeleton className="h-5 w-48 bg-zinc-800" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-24 bg-zinc-800" />
          <Skeleton className="h-9 w-24 bg-zinc-800" />
          <Skeleton className="h-9 w-20 bg-zinc-800" />
        </div>
        <Skeleton className="h-10 w-full bg-zinc-800" />
        <Skeleton className="h-48 w-full bg-zinc-800" />
        <Skeleton className="h-32 w-full bg-zinc-800" />
      </div>
      <div className="space-y-4 border-t border-zinc-700 bg-zinc-950/70 p-4 lg:border-t-0 lg:border-l">
        <Skeleton className="h-6 w-32 bg-zinc-800" />
        <Skeleton className="h-14 w-full bg-zinc-800" />
        <Skeleton className="h-14 w-full bg-zinc-800" />
        <Skeleton className="h-28 w-full bg-zinc-800" />
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
