"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  MapPin,
  NotebookPen,
  Paperclip,
  Pencil,
  UserRound,
} from "lucide-react";

import { getApplicationDetails } from "@/app/(app)/applications/actions";
import {
  MAILBOX_VIEWS,
  type MailboxView,
} from "@/components/applications/application-mailbox-constants";
import { StatusBadge } from "@/components/applications/status-badge";
import { DocumentOpenLink } from "@/components/documents/document-open-link";
import { DocumentPreviewButton } from "@/components/previews/document-preview-dialog";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { documentWorkspaceHref } from "@/lib/latex/types";
import type { JobApplication } from "@/lib/applications/types";
import { formatDate, formatDateTime } from "@/lib/applications/status";

type Details = Awaited<ReturnType<typeof getApplicationDetails>>;

type DocumentItem = {
  id: string;
  version_number: number;
  title: string | null;
  submitted_at: string | null;
  file_path?: string | null;
  content?: string | null;
  content_format?: string;
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
  onBack,
  onViewChange,
  view,
}: {
  applicationId: string | null;
  onBack?: () => void;
  onViewChange?: (view: MailboxView) => void;
  view: MailboxView;
}) {
  if (!applicationId) {
    return <ReadingPaneEmpty />;
  }

  return (
    <LoadedApplicationReadingPane
      key={applicationId}
      applicationId={applicationId}
      onBack={onBack}
      onViewChange={onViewChange}
      view={view}
    />
  );
}

function LoadedApplicationReadingPane({
  applicationId,
  onBack,
  onViewChange,
  view,
}: {
  applicationId: string;
  onBack?: () => void;
  onViewChange?: (view: MailboxView) => void;
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
      <header className="shrink-0 border-b border-border bg-parchment/35">
        <div className="px-4 py-3 sm:px-5 sm:py-4">
          <div className="flex items-start gap-3">
            {onBack ? (
              <Button type="button" variant="ghost" size="icon-sm" onClick={onBack} aria-label="Back to applications" className="-ml-1 lg:hidden">
                <ArrowLeft aria-hidden />
              </Button>
            ) : null}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={application.status} />
                {application.recruitingSeason ? <Badge variant="secondary">{application.recruitingSeason}</Badge> : null}
                {application.sourceHost ? <Badge variant="outline">From {application.sourceHost}</Badge> : null}
              </div>
              <h2 className="mt-2 truncate text-lg font-semibold tracking-[-0.03em] sm:text-xl">{application.jobTitle}</h2>
              <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground"><Building2 aria-hidden className="size-3.5" />{application.companyName}</p>
            </div>
            <div className="flex shrink-0 gap-1.5">
              {application.jobUrl ? (
                <Link href={application.jobUrl} target="_blank" rel="noreferrer" aria-label="Open job post" className={buttonVariants({ variant: "outline", size: "icon-sm" })}>
                  <ExternalLink aria-hidden />
                </Link>
              ) : null}
              <Link href={`/applications/${application.id}/match`} className={buttonVariants({ variant: "outline", size: "sm" })}>Match</Link>
              <Link href={`/applications/${application.id}/edit`} className={buttonVariants({ size: "sm" })}><Pencil aria-hidden className="size-3.5" /><span className="hidden sm:inline">Edit</span></Link>
            </div>
          </div>
        </div>
        {onViewChange ? (
          <nav aria-label="Application details" className="flex gap-1 overflow-x-auto border-t border-border px-3 py-2 sm:px-5">
            {MAILBOX_VIEWS.map((item) => (
              <Button key={item.id} type="button" size="sm" variant={view === item.id ? "secondary" : "ghost"} aria-current={view === item.id ? "page" : undefined} onClick={() => onViewChange(item.id)} className="h-7 shrink-0 px-2.5 text-xs">
                {item.label}
              </Button>
            ))}
          </nav>
        ) : null}
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
            kind="resume_version"
            items={resumeVersions}
            emptyLabel="No resume versions yet."
            submittedEmptyLabel="No submitted resume selected."
          />
        ) : null}
        {view === "cover-letter" ? (
          <DocumentVersions
            heading="Cover letters"
            submitted={submittedCoverLetter}
            kind="cover_letter"
            items={coverLetters}
            emptyLabel="No cover letters yet."
            submittedEmptyLabel="No submitted cover letter selected."
          />
        ) : null}
        {view === "notes" ? (
          <DocumentText value={application.notes} emptyLabel="No notes yet." />
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
    <div className="grid gap-5">
      <dl className="grid overflow-hidden rounded-lg border border-border bg-elevated sm:grid-cols-2">
        <InfoItem icon={<MapPin />} label="Location" value={application.location} />
        <InfoItem icon={<CalendarDays />} label="Applied" value={appliedLabel} />
        <InfoItem icon={<Clock />} label="Deadline" value={deadlineLabel} />
        <InfoItem icon={<Clock />} label="Next action" value={application.nextAction} />
        <InfoItem icon={<UserRound />} label="Referral" value={application.referralContact} />
      </dl>
      <section>
        <div className="flex items-end justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-semibold"><Paperclip aria-hidden className="size-4" />Submitted files</h3>
            <p className="mt-1 text-xs text-muted-foreground">What you sent for this application.</p>
          </div>
          <Link href={`/applications/${application.id}/edit`} className={buttonVariants({ variant: "ghost", size: "sm" })}>Manage</Link>
        </div>
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
      </section>
      <p className="text-xs text-muted-foreground">
        Added {safeFormatDateTime(application.createdAt) ?? "on an unknown date"} · Updated {safeFormatDateTime(application.updatedAt) ?? "on an unknown date"}
      </p>
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
      onClick={(event) => {
        if (
          event.defaultPrevented ||
          event.button !== 0 ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey
        ) {
          return;
        }
        event.preventDefault();
        window.history.pushState(null, "", event.currentTarget.href);
      }}
      className="flex min-w-0 items-center gap-3 rounded-md border border-border bg-parchment/35 p-3 transition-colors duration-150 hover:border-primary/35 hover:bg-primary/[0.035]"
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

function DocumentVersions({
  emptyLabel,
  heading,
  kind,
  items,
  submitted,
  submittedEmptyLabel,
}: {
  emptyLabel: string;
  heading: string;
  kind: "resume_version" | "cover_letter";
  items: DocumentItem[];
  submitted: DocumentItem | null;
  submittedEmptyLabel: string;
}) {
  return (
    <div className="grid gap-5">
      <section>
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold">Submitted version</h3>
          {submitted ? (
            <Badge variant="outline" className="gap-1 border-success/40 bg-success/10 text-success">
              <CheckCircle2 aria-hidden className="size-3" />
              Submitted
            </Badge>
          ) : null}
        </div>
        {submitted ? (
          <div className="mt-3 rounded-lg border border-border bg-elevated p-3">
            <DocumentHeader kind={kind} item={submitted} />
            {submitted.file_path ? <AttachedFileState /> : null}
          </div>
        ) : (
          <EmptyState>{submittedEmptyLabel}</EmptyState>
        )}
      </section>
      <section>
        <h3 className="text-sm font-semibold">{heading}</h3>
        {items.length ? (
          <ul className="mt-3 divide-y divide-border overflow-hidden rounded-lg border border-border bg-elevated">
            {items.map((item) => (
              <li key={item.id} className="p-3">
                <DocumentHeader kind={kind} item={item} />
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

function DocumentHeader({ kind, item }: { kind: "resume_version" | "cover_letter"; item: DocumentItem }) {
  const submittedLabel = safeFormatDate(item.submitted_at);
  const href = documentWorkspaceHref(kind, item.id, item.content_format ?? "plain_text");
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
      <div className="flex shrink-0 gap-2">
        <DocumentPreviewButton kind={kind} id={item.id} title={item.title ?? undefined} variant="ghost" />
        <DocumentOpenLink href={href}>{item.file_path ? "Open file" : "Open"}</DocumentOpenLink>
      </div>
    </div>
  );
}

function AttachedFileState() {
  return (
    <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
      <Paperclip aria-hidden className="size-3.5" />
      Private file attached
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

function InfoItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | null;
}) {
  return (
    <div className="border-b border-border p-3 last:border-b-0 sm:border-r sm:[&:nth-child(2n)]:border-r-0 sm:[&:nth-last-child(-n+2)]:border-b-0">
      <dt className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground [&_svg]:size-3.5">{icon}{label}</dt>
      <dd className="mt-1 text-sm font-medium">{value || "Not set"}</dd>
    </div>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-3 grid place-items-center rounded-lg border border-dashed border-border-strong bg-parchment/35 px-4 py-6 text-center text-sm text-muted-foreground">
      <NotebookPen aria-hidden className="mb-2 size-4 opacity-60" />
      {children}
    </div>
  );
}

function ReadingPaneEmpty() {
  return (
    <div className="motion-rise grid h-full place-items-center p-8 text-center text-muted-foreground">
      <div>
        <span className="mx-auto mb-3 grid size-12 place-items-center rounded-lg border border-border bg-parchment/60 text-primary">
          <FileText aria-hidden className="size-5" />
        </span>
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
