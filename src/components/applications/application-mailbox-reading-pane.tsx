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
  Paperclip,
  Pencil,
  UserRound,
} from "lucide-react";

import { getApplicationDetails } from "@/app/(app)/applications/actions";
import type { MailboxView } from "@/components/applications/application-mailbox-constants";
import { StatusBadge } from "@/components/applications/status-badge";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import type { JobApplication } from "@/lib/applications/types";
import {
  formatDate,
  formatDateTime,
  statusLabels,
} from "@/lib/applications/status";

type Details = Awaited<ReturnType<typeof getApplicationDetails>>;

type DocumentItem = {
  id: string;
  version_number: number;
  title: string | null;
  submitted_at: string | null;
  file_path?: string | null;
  content?: string | null;
};

function safeFormatDate(value: string | null | undefined) {
  if (!value || !Number.isFinite(new Date(value).getTime())) return null;
  return formatDate(value);
}

function safeFormatDateTime(value: string | null | undefined) {
  if (!value || !Number.isFinite(new Date(value).getTime())) return null;
  return formatDateTime(value);
}

export function ApplicationMailboxReadingPane({
  applicationId,
  view,
}: {
  applicationId: string | null;
  view: MailboxView;
}) {
  if (!applicationId) {
    return <ReadingPaneEmpty />;
  }

  return (
    <LoadedApplicationReadingPane
      key={applicationId}
      applicationId={applicationId}
      view={view}
    />
  );
}

function LoadedApplicationReadingPane({
  applicationId,
  view,
}: {
  applicationId: string;
  view: MailboxView;
}) {
  const [details, setDetails] = useState<Details | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    getApplicationDetails(applicationId)
      .then((next) => {
        if (!cancelled) setDetails(next);
      })
      .catch(() => {
        if (!cancelled) setError("Unable to load this application.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [applicationId]);

  if (isLoading) {
    return <ReadingPaneSkeleton />;
  }

  if (error || !details) {
    return (
      <div className="grid h-full place-items-center p-8 text-center">
        <div>
          <h2 className="text-lg font-semibold">Application unavailable</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {error ?? "This application could not be loaded."}
          </p>
        </div>
      </div>
    );
  }

  const { application, coverLetters, resumeVersions } = details;
  const submittedResume =
    resumeVersions.find((v) => v.id === application.submittedResumeVersionId) ?? null;
  const submittedCoverLetter =
    coverLetters.find((c) => c.id === application.submittedCoverLetterId) ?? null;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="shrink-0 border-b border-border bg-parchment/35 px-5 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={application.status} />
          {application.recruitingSeason ? (
            <Badge variant="secondary">{application.recruitingSeason}</Badge>
          ) : null}
          {application.sourceHost ? (
            <Badge variant="outline">Captured · {application.sourceHost}</Badge>
          ) : null}
        </div>
        <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em]">
          {application.jobTitle}
        </h2>
        <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
          <Building2 aria-hidden className="size-4" />
          {application.companyName}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
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
            href={`/applications/${application.id}/match`}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            Career match
          </Link>
          <Link
            href={`/applications/${application.id}/edit`}
            className={buttonVariants({ size: "sm" })}
          >
            <Pencil aria-hidden className="size-3.5" />
            Edit
          </Link>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-5">
        {view === "overview" ? (
          <div className="grid gap-4">
            <OverviewSection
              application={application}
              submittedCoverLetter={submittedCoverLetter}
              submittedResume={submittedResume}
            />
            <Link
              href={`/applications/${application.id}/edit`}
              className={buttonVariants({ variant: "outline", size: "sm", className: "w-fit" })}
            >
              Manage application package
            </Link>
          </div>
        ) : null}
        {view === "job-description" ? (
          <DocumentText
            value={application.jobDescription}
            emptyLabel="No job description saved for this role."
          />
        ) : null}
        {view === "resume" ? (
          <DocumentVersions
            heading="Resume versions"
            submitted={submittedResume}
            itemHref={(id) => `/resumes/versions/${id}`}
            items={resumeVersions}
            emptyLabel="No resume versions yet."
            submittedEmptyLabel="No submitted resume selected."
          />
        ) : null}
        {view === "cover-letter" ? (
          <DocumentVersions
            heading="Cover letters"
            submitted={submittedCoverLetter}
            itemHref={(id) => `/cover-letters/${id}`}
            items={coverLetters}
            emptyLabel="No cover letters yet."
            submittedEmptyLabel="No submitted cover letter selected."
          />
        ) : null}
        {view === "notes" ? (
          <DocumentText value={application.notes} emptyLabel="No notes yet." />
        ) : null}
        {view === "activity" ? (
          <ActivitySection
            application={application}
            submittedCoverLetter={submittedCoverLetter}
            submittedResume={submittedResume}
          />
        ) : null}
      </div>
    </div>
  );
}

function OverviewSection({
  application,
  submittedCoverLetter,
  submittedResume,
}: {
  application: JobApplication;
  submittedCoverLetter: DocumentItem | null;
  submittedResume: DocumentItem | null;
}) {
  const appliedLabel = safeFormatDate(application.appliedAt);
  const deadlineLabel = safeFormatDate(application.deadline);

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <InfoTile icon={<MapPin className="size-4" />} label="Location" value={application.location} />
        <InfoTile icon={<CalendarDays className="size-4" />} label="Applied" value={appliedLabel} />
        <InfoTile icon={<Clock className="size-4" />} label="Deadline" value={deadlineLabel} />
        <InfoTile icon={<Clock className="size-4" />} label="Next action" value={application.nextAction} />
        <InfoTile icon={<UserRound className="size-4" />} label="Referral" value={application.referralContact} />
      </div>
      <div className="rounded-lg border border-border bg-elevated p-4">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <Paperclip aria-hidden className="size-4" />
          Application package
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          The exact documents recorded for this role.
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <PackageDocumentLink
            href={`/applications?id=${application.id}&view=resume`}
            label="Submitted resume"
            document={submittedResume}
          />
          <PackageDocumentLink
            href={`/applications?id=${application.id}&view=cover-letter`}
            label="Submitted cover letter"
            document={submittedCoverLetter}
          />
        </div>
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
          Created {safeFormatDateTime(application.createdAt) ?? "Unknown"}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Updated {safeFormatDateTime(application.updatedAt) ?? "Unknown"}
        </p>
      </div>
      {application.jobDescription ? (
        <div>
          <p className="mb-2 text-sm font-semibold">Job description preview</p>
          <DocumentText
            value={application.jobDescription.slice(0, 1200)}
            emptyLabel=""
          />
        </div>
      ) : null}
    </div>
  );
}

function PackageDocumentLink({
  document,
  href,
  label,
}: {
  document: DocumentItem | null;
  href: string;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex min-w-0 items-center gap-3 rounded-md border border-border bg-parchment/35 p-3 transition-colors hover:border-primary/35 hover:bg-primary/[0.035]"
    >
      <span className="grid size-8 shrink-0 place-items-center rounded-md border border-border bg-background text-primary">
        <FileText aria-hidden className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-semibold">{label}</span>
        <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
          {document
            ? document.title || `Version ${document.version_number}`
            : "Not attached"}
        </span>
      </span>
      <Badge variant={document ? "outline" : "secondary"} className="shrink-0 text-[10px]">
        {document ? "Saved" : "Missing"}
      </Badge>
    </Link>
  );
}

function ActivitySection({
  application,
  submittedCoverLetter,
  submittedResume,
}: {
  application: JobApplication;
  submittedCoverLetter: DocumentItem | null;
  submittedResume: DocumentItem | null;
}) {
  return (
    <div className="grid gap-4">
      <div className="flex items-center gap-3">
        <MessageSquareText aria-hidden className="size-5 text-muted-foreground" />
        <h3 className="text-base font-semibold">Activity</h3>
      </div>
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
          time={safeFormatDateTime(submittedResume.submitted_at) ?? "Marked as submitted"}
        />
      ) : null}
      {submittedCoverLetter ? (
        <ActivityEntry
          initials="CL"
          title={`Submitted cover letter v${submittedCoverLetter.version_number}`}
          time={safeFormatDateTime(submittedCoverLetter.submitted_at) ?? "Marked as submitted"}
        />
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
    <div className="flex gap-3 rounded-lg border border-border bg-elevated p-3">
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
  itemHref,
  items,
  submitted,
  submittedEmptyLabel,
}: {
  emptyLabel: string;
  heading: string;
  itemHref: (id: string) => string;
  items: DocumentItem[];
  submitted: DocumentItem | null;
  submittedEmptyLabel: string;
}) {
  return (
    <div className="grid gap-4">
      <section className="rounded-lg border border-border bg-elevated p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold">Submitted</p>
          {submitted ? (
            <Badge variant="outline" className="gap-1 border-success/40 bg-success/10 text-success">
              <CheckCircle2 aria-hidden className="size-3" />
              Submitted
            </Badge>
          ) : null}
        </div>
        {submitted ? (
          <div className="mt-3 grid gap-3">
            <DocumentHeader href={itemHref(submitted.id)} item={submitted} />
            {submitted.content ? (
              <DocumentText value={submitted.content} emptyLabel="" />
            ) : submitted.file_path ? (
              <AttachedFileState />
            ) : (
              <DocumentText value={null} emptyLabel="This version has no text or file saved." />
            )}
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
              <li key={item.id} className="rounded-md border border-border bg-parchment/45 p-3">
                <DocumentHeader href={itemHref(item.id)} item={item} />
                {item.content ? (
                  <p className="mt-2 line-clamp-4 text-sm text-muted-foreground">{item.content}</p>
                ) : item.file_path ? (
                  <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Paperclip aria-hidden className="size-3.5" />
                    Private file attached
                  </p>
                ) : null}
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

function DocumentHeader({ href, item }: { href: string; item: DocumentItem }) {
  const submittedLabel = safeFormatDate(item.submitted_at);
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">
          Version {item.version_number}
          {item.title ? ` · ${item.title}` : ""}
        </p>
        {submittedLabel ? (
          <span className="text-xs text-muted-foreground">{submittedLabel}</span>
        ) : null}
      </div>
      <Link href={href} className={buttonVariants({ variant: "outline", size: "sm" })}>
        {item.file_path ? "Open file" : "Open"}
      </Link>
    </div>
  );
}

function AttachedFileState() {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-dashed border-border-strong bg-parchment/35 p-4 text-sm text-muted-foreground">
      <span className="grid size-9 shrink-0 place-items-center rounded-md border border-border bg-background text-primary">
        <Paperclip aria-hidden className="size-4" />
      </span>
      <span>
        <span className="block font-medium text-foreground">Private file attached</span>
        Open the document to preview or download the submitted copy.
      </span>
    </div>
  );
}

function DocumentText({
  emptyLabel,
  value,
}: {
  emptyLabel: string;
  value: string | null;
}) {
  if (!value) return <EmptyState>{emptyLabel}</EmptyState>;
  return (
    <div className="paper-rule max-h-[32rem] overflow-y-auto whitespace-pre-wrap rounded-lg border border-border bg-parchment/40 p-4 text-sm leading-7 text-muted-foreground">
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
      <p className="mt-2 text-sm font-medium">{value || "Not set"}</p>
    </div>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-3 grid place-items-center rounded-lg border border-dashed border-border-strong bg-parchment/35 px-4 py-8 text-center text-sm text-muted-foreground">
      <NotebookPen aria-hidden className="mb-2 size-5 opacity-60" />
      {children}
    </div>
  );
}

function ReadingPaneEmpty() {
  return (
    <div className="grid h-full place-items-center p-8 text-center text-muted-foreground">
      <div>
        <FileText aria-hidden className="mx-auto mb-3 size-10 opacity-40" />
        <p className="text-base font-semibold text-foreground">Select a role to read</p>
        <p className="mt-1 text-sm">Choose an application from the list to view details.</p>
      </div>
    </div>
  );
}

function ReadingPaneSkeleton() {
  return (
    <div className="space-y-4 p-5">
      <Skeleton className="h-6 w-28" />
      <Skeleton className="h-8 w-3/4" />
      <Skeleton className="h-5 w-48" />
      <Skeleton className="h-48 w-full" />
    </div>
  );
}

function initialsFor(value: string) {
  return (
    value
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "JM"
  );
}
