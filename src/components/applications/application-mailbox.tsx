"use client";

import { useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, Search } from "lucide-react";

import { ApplicationComposePane } from "@/components/applications/application-compose-pane";
import { ApplicationMailboxReadingPane } from "@/components/applications/application-mailbox-reading-pane";
import { setApplicationSidebarCounts } from "@/components/applications/application-sidebar-store";
import {
  MAILBOX_SCOPES,
  MAILBOX_VIEWS,
  parseMailboxScope,
  parseMailboxView,
  type MailboxView,
} from "@/components/applications/application-mailbox-constants";
import { StatusBadge } from "@/components/applications/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import {
  applicationStatuses,
  type ApplicationStatus,
  type JobApplication,
} from "@/lib/applications/types";
import { formatDate, statusLabels } from "@/lib/applications/status";
import { cn } from "@/lib/utils";

const activeStatuses = new Set<ApplicationStatus>([
  "saved",
  "applied",
  "online_assessment",
  "interview",
  "final_round",
]);
const closedStatuses = new Set<ApplicationStatus>(["offer", "rejected", "withdrawn"]);

type ApplicationMailboxProps = {
  applications: JobApplication[];
  query?: string;
  status?: ApplicationStatus | "all";
};

function buildHref(params: Record<string, string | null | undefined>) {
  const next = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) next.set(key, value);
  }
  const query = next.toString();
  return query ? `/applications?${query}` : "/applications";
}

function initialsFor(company: string) {
  return (
    company
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "?"
  );
}

function avatarColor(company: string) {
  const colors = [
    "bg-primary/20 text-primary",
    "bg-stage-interview/20 text-stage-interview",
    "bg-stage-offer/20 text-stage-offer",
    "bg-stage-assessment/20 text-stage-assessment",
  ];
  let hash = 0;
  for (let i = 0; i < company.length; i += 1) hash = company.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

export function ApplicationMailbox({
  applications,
  query = "",
  status = "all",
}: ApplicationMailboxProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const selectedId = searchParams.get("id");
  const isComposing = searchParams.get("compose") === "new";
  const composeError = searchParams.get("error");
  const view = parseMailboxView(searchParams.get("view"));
  const scope = parseMailboxScope(searchParams.get("scope"));

  const scopedApplications = useMemo(() => {
    if (scope === "active") {
      return applications.filter((app) => activeStatuses.has(app.status));
    }
    if (scope === "closed") {
      return applications.filter((app) => closedStatuses.has(app.status));
    }
    return applications;
  }, [applications, scope]);

  const stats = useMemo(
    () => ({
      total: applications.length,
      active: applications.filter((app) => activeStatuses.has(app.status)).length,
      offers: applications.filter((app) => app.status === "offer").length,
    }),
    [applications],
  );

  useEffect(() => {
    setApplicationSidebarCounts({
      active: stats.active,
      closed: applications.filter((app) => closedStatuses.has(app.status)).length,
      total: stats.total,
    });
    return () => setApplicationSidebarCounts(null);
  }, [applications, stats.active, stats.total]);

  function navigate(updates: Record<string, string | null | undefined>) {
    const href = buildHref({
      q: query || null,
      status: status === "all" ? null : status,
      scope: scope === "all" ? null : scope,
      id: selectedId,
      view: view === "overview" ? null : view,
      compose: isComposing ? "new" : null,
      error: composeError,
      ...updates,
    });
    router.push(href);
  }

  function selectApplication(id: string) {
    navigate({ id, view: "overview", compose: null, error: null });
  }

  function openComposer() {
    navigate({ id: null, view: null, compose: "new", error: null });
  }

  function closeComposer() {
    navigate({ compose: null, error: null });
  }

  function setView(nextView: MailboxView) {
    navigate({ view: nextView === "overview" ? null : nextView });
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background">
      <header className="flex shrink-0 items-center gap-3 border-b border-border bg-primary px-4 py-2.5 text-primary-foreground">
        <SidebarTrigger className="-ml-1 text-primary-foreground hover:bg-primary-foreground/15 hover:text-primary-foreground md:hidden" />
        <div className="flex min-w-0 items-baseline gap-2">
          <h1 className="text-base font-bold tracking-[-0.02em]">Applications</h1>
          <span className="hidden text-xs text-primary-foreground/80 sm:inline">JobMaxxing</span>
        </div>
        <div className="hidden items-center gap-1.5 sm:flex">
          <StatPill label="Total" value={stats.total} />
          <StatPill label="Active" value={stats.active} />
          <StatPill label="Offers" value={stats.offers} />
        </div>
        <div className="flex-1" />
        <form
          className="hidden items-center gap-2 md:flex"
          onSubmit={(event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            const q = String(formData.get("q") ?? "").trim();
            navigate({ q: q || null });
          }}
        >
          <div className="relative">
            <Search
              aria-hidden
              className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              name="q"
              defaultValue={query}
              placeholder="Search title or company…"
              className="h-8 w-52 border-transparent bg-background pl-8 text-[13px] text-foreground"
            />
          </div>
          <Select
            name="status"
            defaultValue={status}
            className="h-8 w-36 border-transparent bg-background text-[13px] text-foreground"
            onChange={(event) => {
              const nextStatus = event.target.value;
              navigate({ status: nextStatus === "all" ? null : nextStatus });
            }}
          >
            <option value="all">All statuses</option>
            {applicationStatuses.map((item) => (
              <option key={item} value={item}>
                {statusLabels[item]}
              </option>
            ))}
          </Select>
        </form>
        <Button
          type="button"
          size="sm"
          onClick={openComposer}
          className="h-8 gap-1 bg-primary-foreground text-primary hover:bg-primary-foreground/90"
        >
          <Plus aria-hidden className="size-3.5" />
          New role
        </Button>
        <ThemeToggle className="text-primary-foreground hover:bg-primary-foreground/15 hover:text-primary-foreground" />
      </header>

      <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(19rem,24rem)_minmax(0,1fr)]">
        <section
          className={cn(
            "min-h-0 overflow-y-auto border-r border-border bg-background",
            selectedId || isComposing ? "hidden lg:block" : "block",
          )}
        >
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background px-4 py-2.5">
            <p className="text-sm font-semibold">
              {MAILBOX_SCOPES.find((item) => item.id === scope)?.label ?? "Applications"}
            </p>
            <p className="text-xs text-muted-foreground">{scopedApplications.length} roles</p>
          </div>

          {scopedApplications.length === 0 ? (
            <div className="grid place-items-center px-4 py-16 text-center text-sm text-muted-foreground">
              No applications in this mailbox.
            </div>
          ) : (
            <ul>
              {scopedApplications.map((application) => (
                <li key={application.id}>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => selectApplication(application.id)}
                    className={cn(
                      "h-auto w-full justify-start gap-3 rounded-none border-b border-border px-3 py-3 text-left whitespace-normal transition-colors",
                      "border-l-[3px] border-l-transparent hover:bg-muted/50",
                      selectedId === application.id && "border-l-primary bg-primary/5",
                    )}
                  >
                    <span
                      className={cn(
                        "grid size-9 shrink-0 place-items-center rounded-full text-xs font-bold",
                        avatarColor(application.companyName),
                      )}
                    >
                      {initialsFor(application.companyName)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-start justify-between gap-2">
                        <span className="truncate text-sm font-semibold">{application.jobTitle}</span>
                        <span className="shrink-0 text-[11px] text-muted-foreground">
                          {formatDate(application.appliedAt) ?? formatDate(application.updatedAt) ?? ""}
                        </span>
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                        {application.companyName}
                      </span>
                      <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        <StatusBadge status={application.status} className="text-[10px]" />
                        {application.submittedResumeVersionId ? (
                          <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium">
                            Resume
                          </span>
                        ) : null}
                        {application.submittedCoverLetterId ? (
                          <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium">
                            Cover letter
                          </span>
                        ) : null}
                      </span>
                    </span>
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section
          className={cn(
            "min-h-0 overflow-hidden bg-background",
            selectedId || isComposing ? "block" : "hidden lg:block",
          )}
        >
          {isComposing ? (
            <ApplicationComposePane
              defaultStatus={status === "all" ? "saved" : status}
              error={composeError}
              onClose={closeComposer}
            />
          ) : selectedId ? (
            <div className="flex h-full min-h-0 flex-col">
              <div className="flex items-center gap-2 border-b border-border px-3 py-2 lg:hidden">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate({ id: null, view: null })}
                >
                  ← Back
                </Button>
                <div className="flex flex-1 gap-1 overflow-x-auto">
                  {MAILBOX_VIEWS.map((item) => (
                    <Button
                      key={item.id}
                      type="button"
                      size="sm"
                      variant={view === item.id ? "default" : "secondary"}
                      onClick={() => setView(item.id)}
                      className="h-7 shrink-0 px-2.5 text-xs"
                    >
                      {item.label}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="min-h-0 flex-1">
                <ApplicationMailboxReadingPane applicationId={selectedId} view={view} />
              </div>
            </div>
          ) : (
            <ApplicationMailboxReadingPane applicationId={null} view={view} />
          )}
        </section>
      </div>
    </div>
  );
}

function StatPill({ label, value }: { label: string; value: number }) {
  return (
    <span className="inline-flex items-baseline gap-1 rounded-full bg-primary-foreground/15 px-2.5 py-0.5">
      <span className="text-xs font-bold tabular-nums">{value}</span>
      <span className="text-[10px] uppercase tracking-wide text-primary-foreground/85">{label}</span>
    </span>
  );
}
