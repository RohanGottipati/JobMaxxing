"use client";

import { useEffect, useMemo, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, Search } from "lucide-react";

import { getApplicationDetails } from "@/app/(app)/applications/actions";
import { ApplicationComposePane } from "@/components/applications/application-compose-pane";
import {
  ApplicationMailboxReadingPane,
  type ApplicationDetailsCache,
} from "@/components/applications/application-mailbox-reading-pane";
import { DeleteApplicationButton } from "@/components/applications/delete-application-button";
import {
  MAILBOX_SCOPES,
  parseMailboxScope,
  parseMailboxView,
} from "@/components/applications/application-mailbox-constants";
import { StatusBadge } from "@/components/applications/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { SidebarTrigger } from "@/components/ui/sidebar";
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

const PREFETCH_COUNT = 10;

// Newest first, by date applied (falling back to when the row was added).
function appliedTimestamp(application: JobApplication) {
  const value = application.appliedAt ?? application.createdAt;
  const time = value ? new Date(value).getTime() : 0;
  return Number.isFinite(time) ? time : 0;
}

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

  const { scopeCounts, scopedApplications } = useMemo(() => {
    const counts = { all: applications.length, active: 0, closed: 0 };
    const scoped: JobApplication[] = [];

    for (const application of applications) {
      const isActive = activeStatuses.has(application.status);
      const isClosed = closedStatuses.has(application.status);
      if (isActive) counts.active += 1;
      if (isClosed) counts.closed += 1;
      if (
        scope === "all" ||
        (scope === "active" && isActive) ||
        (scope === "closed" && isClosed)
      ) {
        scoped.push(application);
      }
    }

    scoped.sort((a, b) => appliedTimestamp(b) - appliedTimestamp(a));

    return { scopeCounts: counts, scopedApplications: scoped };
  }, [applications, scope]);

  // Details are re-fetched per open; cache them and warm the top rows in the
  // background so opening a recent application shows its data instantly.
  const detailsCache = useMemo<ApplicationDetailsCache>(() => new Map(), []);
  const prefetching = useRef<Set<string>>(new Set());

  useEffect(() => {
    const inFlight = prefetching.current;
    for (const application of scopedApplications.slice(0, PREFETCH_COUNT)) {
      const { id } = application;
      if (detailsCache.has(id) || inFlight.has(id)) continue;
      inFlight.add(id);
      getApplicationDetails(id)
        .then((details) => {
          if (details) detailsCache.set(id, details);
        })
        .catch(() => {})
        .finally(() => inFlight.delete(id));
    }
  }, [scopedApplications, detailsCache]);

  const selectedApplication = useMemo(
    () => applications.find((application) => application.id === selectedId) ?? null,
    [applications, selectedId],
  );

  function navigate(
    updates: Record<string, string | null | undefined>,
    options: { loadServerData?: boolean } = {},
  ) {
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
    if (options.loadServerData) {
      router.push(href, { scroll: false });
      return;
    }
    window.history.pushState(null, "", href);
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

  function handleDeleted(id: string) {
    // Drop the reading pane if it was showing the row we just removed, then
    // re-pull the revalidated server data so the list reflects the deletion.
    if (selectedId === id) {
      navigate({ id: null, view: null });
    }
    router.refresh();
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-sidebar-border bg-sidebar px-3 text-sidebar-foreground sm:px-4">
        <SidebarTrigger className="-ml-1 text-muted-foreground hover:bg-sidebar-accent hover:text-foreground md:hidden" />
        <div className="flex min-w-0 items-baseline gap-2">
          <h1 className="text-base font-bold tracking-[-0.02em]">Applications</h1>
          <span className="text-xs tabular-nums text-muted-foreground">{applications.length}</span>
        </div>
        <div className="flex-1" />
        <Button
          type="button"
          size="sm"
          onClick={openComposer}
          className="h-8 gap-1"
        >
          <Plus aria-hidden className="size-3.5" />
          Add application
        </Button>
      </header>

      <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(19rem,24rem)_minmax(0,1fr)]">
        <section
          className={cn(
            "min-h-0 overflow-y-auto border-r border-border bg-background",
            selectedId || isComposing ? "hidden lg:block" : "block",
          )}
        >
          <div className="sticky top-0 z-10 grid gap-2 border-b border-border bg-background p-3">
            <div className="flex gap-1 overflow-x-auto" role="group" aria-label="Application scope">
              {MAILBOX_SCOPES.map((item) => {
                return (
                  <Button
                    key={item.id}
                    type="button"
                    aria-pressed={scope === item.id}
                    size="sm"
                    variant={scope === item.id ? "secondary" : "ghost"}
                    onClick={() => navigate({ scope: item.id === "all" ? null : item.id, id: null })}
                    className="h-7 shrink-0 px-2.5 text-xs"
                  >
                    {item.id === "all" ? "All" : item.label}
                    <span className="text-[10px] tabular-nums text-muted-foreground">{scopeCounts[item.id]}</span>
                  </Button>
                );
              })}
            </div>
            <form
              className="grid grid-cols-[minmax(0,1fr)_8.75rem] gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                const formData = new FormData(event.currentTarget);
                const q = String(formData.get("q") ?? "").trim();
                navigate({ q: q || null, id: null }, { loadServerData: true });
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
                  placeholder="Search applications"
                  aria-label="Search applications"
                  className="h-8 border-border bg-background pl-8 text-[13px]"
                />
              </div>
              <Select
                name="status"
                aria-label="Filter by status"
                defaultValue={status}
                className="h-8 border-border bg-background text-[13px]"
                onChange={(event) => {
                  const nextStatus = event.target.value;
                  navigate(
                    { status: nextStatus === "all" ? null : nextStatus, id: null },
                    { loadServerData: true },
                  );
                }}
              >
                <option value="all">Any status</option>
                {applicationStatuses.map((item) => (
                  <option key={item} value={item}>{statusLabels[item]}</option>
                ))}
              </Select>
            </form>
          </div>

          {scopedApplications.length === 0 ? (
            <div className="grid place-items-center px-4 py-16 text-center text-sm text-muted-foreground">
              No applications in this mailbox.
            </div>
          ) : (
            <ul>
              {scopedApplications.map((application) => (
                <li key={application.id} className="group relative">
                  <button
                    type="button"
                    onClick={() => selectApplication(application.id)}
                    className={cn(
                      "flex w-full items-start gap-3 border-b border-border py-3 pl-3 pr-11 text-left transition-colors duration-150",
                      "border-l-[3px] border-l-transparent hover:bg-muted/50",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-inset",
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
                  </button>
                  <div
                    className={cn(
                      "absolute right-2 top-1/2 -translate-y-1/2 opacity-0 transition-opacity",
                      "group-hover:opacity-100 focus-within:opacity-100",
                    )}
                  >
                    <DeleteApplicationButton
                      applicationId={application.id}
                      jobTitle={application.jobTitle}
                      companyName={application.companyName}
                      onDeleted={handleDeleted}
                    />
                  </div>
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
            <ApplicationMailboxReadingPane
              applicationId={selectedId}
              detailsCache={detailsCache}
              initialApplication={selectedApplication}
              view={view}
              onBack={() => navigate({ id: null, view: null })}
              onViewChange={(nextView) => navigate({ view: nextView === "overview" ? null : nextView })}
            />
          ) : (
            <ApplicationMailboxReadingPane applicationId={null} view={view} />
          )}
        </section>
      </div>
    </div>
  );
}
