"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  Columns3,
  ExternalLink,
  MapPin,
  Rows3,
} from "lucide-react";

import { ApplicationBoard } from "@/components/applications/application-board";
import { StatusBadge } from "@/components/applications/status-badge";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type {
  ApplicationStatus,
  JobApplication,
} from "@/lib/applications/types";
import { formatDate } from "@/lib/applications/status";
import { cn } from "@/lib/utils";

type ViewMode = "board" | "table";
type Scope = "all" | "active" | "closed";

const activeStatuses = new Set<ApplicationStatus>([
  "saved",
  "applied",
  "online_assessment",
  "interview",
  "final_round",
]);
const closedStatuses = new Set<ApplicationStatus>([
  "offer",
  "rejected",
  "withdrawn",
]);

export function ApplicationViews({
  applications,
  visibleStatus,
}: {
  applications: JobApplication[];
  visibleStatus: ApplicationStatus | "all";
}) {
  const [view, setView] = useState<ViewMode>("board");
  const [scope, setScope] = useState<Scope>("all");
  const scopedApplications = useMemo(() => {
    if (scope === "active") {
      return applications.filter((application) =>
        activeStatuses.has(application.status),
      );
    }
    if (scope === "closed") {
      return applications.filter((application) =>
        closedStatuses.has(application.status),
      );
    }
    return applications;
  }, [applications, scope]);

  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between gap-3">
        <p className="tabular-nums text-xs text-muted-foreground">
          {applications.length} {applications.length === 1 ? "application" : "applications"}
        </p>
        <ToggleGroup
          type="single"
          value={view}
          onValueChange={(value) => value && setView(value as ViewMode)}
          variant="outline"
          size="sm"
          aria-label="Application view"
          className="bg-parchment"
        >
          <ToggleGroupItem value="board" aria-label="Board view">
            <Columns3 aria-hidden />Board
          </ToggleGroupItem>
          <ToggleGroupItem value="table" aria-label="Table view">
            <Rows3 aria-hidden />Table
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {view === "board" ? (
        <ApplicationBoard applications={applications} visibleStatus={visibleStatus} />
      ) : (
        <div>
          <div
            role="tablist"
            aria-label="Application table scope"
            className="flex items-end gap-1 overflow-x-auto"
          >
            <ScopeTab value="all" label="All Applications" count={applications.length} active={scope === "all"} onSelect={setScope} />
            <ScopeTab value="active" label="Active" count={applications.filter((item) => activeStatuses.has(item.status)).length} active={scope === "active"} onSelect={setScope} />
            <ScopeTab value="closed" label="Closed" count={applications.filter((item) => closedStatuses.has(item.status)).length} active={scope === "closed"} onSelect={setScope} />
          </div>
          <ApplicationTable applications={scopedApplications} />
        </div>
      )}
    </div>
  );
}

function ScopeTab({
  active,
  count,
  label,
  onSelect,
  value,
}: {
  active: boolean;
  count: number;
  label: string;
  onSelect: (scope: Scope) => void;
  value: Scope;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={() => onSelect(value)}
      className={cn(
        "folder-tab -mb-px flex shrink-0 items-center gap-2 border border-b-0 px-4 pt-2 pb-2.5 text-[13px] font-medium transition duration-200 hover:-translate-y-0.5",
        active
          ? "border-border bg-card text-foreground"
          : "border-transparent bg-parchment/70 text-muted-foreground hover:bg-parchment hover:text-foreground",
      )}
    >
      {label}
      <span className="rounded bg-background/70 px-1.5 py-0.5 text-[11px] tabular-nums text-muted-foreground">
        {count}
      </span>
    </button>
  );
}

function ApplicationTable({ applications }: { applications: JobApplication[] }) {
  if (!applications.length) {
    return (
      <div className="grid min-h-64 place-items-center rounded-b-xl border border-dashed border-border-strong bg-parchment/40 p-8 text-center">
        <div>
          <p className="font-medium">No applications in this view.</p>
          <p className="mt-1 text-sm text-muted-foreground">Choose another folder tab or adjust your filters.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="hidden md:block">
        <p className="mb-2 flex items-center gap-1.5 text-[0.68rem] text-muted-foreground xl:hidden">
          <ArrowRight aria-hidden className="size-3" />Scroll sideways to review every column
        </p>
        <Table
          className="min-w-[1120px] border-collapse"
          containerClassName="surface-grid rounded-b-xl rounded-tr-xl border border-border bg-card shadow-paper"
          scrollLabel="Applications table. Scroll horizontally to view every column."
        >
          <TableHeader>
            <TableRow className="border-b border-border-strong bg-parchment/95 hover:bg-parchment/95">
              <TableHead className="sticky left-0 z-20 w-14 border-r border-border bg-parchment">Open</TableHead>
              <TableHead className="sticky left-14 z-20 min-w-56 border-r border-border bg-parchment shadow-[5px_0_8px_-8px_rgb(41_40_36/0.5)]">Job title</TableHead>
              <TableHead className="min-w-36 border-r border-border">Company</TableHead>
              <TableHead className="min-w-40 border-r border-border">Status</TableHead>
              <TableHead className="min-w-40 border-r border-border">Location</TableHead>
              <TableHead className="min-w-32 border-r border-border">Applied</TableHead>
              <TableHead className="min-w-32 border-r border-border">Deadline</TableHead>
              <TableHead className="min-w-64 border-r border-border">Next action</TableHead>
              <TableHead className="min-w-36">Package</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {applications.map((application) => {
              const complete = Boolean(
                application.submittedResumeVersionId &&
                  application.submittedCoverLetterId,
              );
              return (
                <TableRow key={application.id} className="border-b border-border bg-card/95 hover:bg-accent/60">
                  <TableCell className="sticky left-0 z-10 border-r border-border bg-card">
                    {application.jobUrl ? (
                      <a href={application.jobUrl} target="_blank" rel="noreferrer" aria-label={`Open ${application.companyName} job post`} className="grid size-7 place-items-center rounded text-muted-foreground hover:bg-background hover:text-foreground">
                        <ExternalLink aria-hidden className="size-3.5" />
                      </a>
                    ) : "—"}
                  </TableCell>
                  <TableCell className="sticky left-14 z-10 border-r border-border bg-card shadow-[5px_0_8px_-8px_rgb(41_40_36/0.5)]">
                    <Link href={`/applications/${application.id}`} className="font-medium underline-offset-2 hover:underline">
                      {application.jobTitle}
                    </Link>
                  </TableCell>
                  <TableCell className="border-r border-border">{application.companyName}</TableCell>
                  <TableCell className="border-r border-border"><StatusBadge status={application.status} /></TableCell>
                  <TableCell className="border-r border-border text-muted-foreground">{application.location || "—"}</TableCell>
                  <TableCell className="border-r border-border tabular-nums text-muted-foreground">{formatDate(application.appliedAt)}</TableCell>
                  <TableCell className="border-r border-border tabular-nums text-muted-foreground">{formatDate(application.deadline)}</TableCell>
                  <TableCell className="border-r border-border text-muted-foreground"><span className="line-clamp-2">{application.nextAction || "—"}</span></TableCell>
                  <TableCell><Badge variant={complete ? "default" : "outline"}>{complete ? "Complete" : "Incomplete"}</Badge></TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <div className="overflow-hidden rounded-b-xl border border-border bg-card shadow-paper md:hidden">
        {applications.map((application) => (
          <details key={application.id} className="group border-b border-border last:border-b-0 open:bg-accent/20">
            <summary className="motion-list-item flex min-h-24 cursor-pointer list-none items-start justify-between gap-3 p-4 transition-colors hover:bg-accent/45 [&::-webkit-details-marker]:hidden">
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{application.jobTitle}</span>
                <span className="mt-0.5 block truncate text-sm text-muted-foreground">{application.companyName}</span>
                <span className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
                  {application.location ? <span className="flex min-w-0 items-center gap-1"><MapPin aria-hidden className="size-3.5 shrink-0" /><span className="truncate">{application.location}</span></span> : null}
                  <span className="flex items-center gap-1"><CalendarDays aria-hidden className="size-3.5" />{formatDate(application.deadline)}</span>
                </span>
              </span>
              <span className="flex shrink-0 flex-col items-end gap-3">
                <StatusBadge status={application.status} />
                <span className="text-[0.68rem] text-muted-foreground group-open:hidden">More</span>
                <span className="hidden text-[0.68rem] text-muted-foreground group-open:block">Less</span>
              </span>
            </summary>
            <div className="motion-drop border-t border-border bg-parchment/35 px-4 py-4">
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
                <div><dt className="micro-label text-muted-foreground">Applied</dt><dd className="mt-1.5">{formatDate(application.appliedAt)}</dd></div>
                <div><dt className="micro-label text-muted-foreground">Deadline</dt><dd className="mt-1.5">{formatDate(application.deadline)}</dd></div>
                <div className="col-span-2"><dt className="micro-label text-muted-foreground">Package</dt><dd className="mt-1.5"><Badge variant={application.submittedResumeVersionId && application.submittedCoverLetterId ? "default" : "outline"}>{application.submittedResumeVersionId && application.submittedCoverLetterId ? "Complete" : "Incomplete"}</Badge></dd></div>
                <div className="col-span-2"><dt className="micro-label text-muted-foreground">Next action</dt><dd className="mt-1.5 leading-5 text-muted-foreground">{application.nextAction || "No next action saved."}</dd></div>
              </dl>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link href={`/applications/${application.id}`} className="inline-flex min-h-10 items-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground">View details<ArrowRight aria-hidden className="size-4" /></Link>
                {application.jobUrl ? <a href={application.jobUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-medium">Job post<ExternalLink aria-hidden className="size-4" /></a> : null}
              </div>
            </div>
          </details>
        ))}
      </div>
    </>
  );
}
