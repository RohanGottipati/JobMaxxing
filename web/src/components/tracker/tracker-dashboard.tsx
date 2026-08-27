"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Globe, Inbox, Search } from "lucide-react";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ACTIVE_TRACKED_JOB_STATUSES,
  TRACKED_JOB_SEASONS,
  TRACKED_JOB_STATUSES,
  UNASSIGNED_SEASON,
  trackedJobStatusLabels,
  type TrackedJob,
  type TrackedJobStatus,
} from "@/lib/tracked-jobs/types";
import { TrackerStatusBadge } from "@/components/tracker/tracker-status-badge";
import {
  avatarClasses,
  formatShortDate,
  initials,
  seasonKey,
} from "@/components/tracker/utils";

type TrackerDashboardProps = {
  jobs: TrackedJob[];
};

const SEASON_ORDER = [...TRACKED_JOB_SEASONS, UNASSIGNED_SEASON];

function sortSeasons(a: string, b: string): number {
  const ia = SEASON_ORDER.indexOf(a);
  const ib = SEASON_ORDER.indexOf(b);
  if (ia === -1 && ib === -1) return a.localeCompare(b);
  if (ia === -1) return 1;
  if (ib === -1) return -1;
  return ia - ib;
}

export function TrackerDashboard({ jobs }: TrackerDashboardProps) {
  const router = useRouter();
  const [items, setItems] = useState<TrackedJob[]>(jobs);
  const [search, setSearch] = useState("");
  const [seasonFilter, setSeasonFilter] = useState<string>("all");
  const [selectedId, setSelectedId] = useState<string | null>(jobs[0]?.id ?? null);

  const stats = useMemo(() => {
    const total = items.length;
    const active = items.filter((j) =>
      ACTIVE_TRACKED_JOB_STATUSES.includes(j.status),
    ).length;
    const offers = items.filter((j) => j.status === "offer").length;
    return { total, active, offers };
  }, [items]);

  const seasonCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const job of items) {
      const key = seasonKey(job);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return counts;
  }, [items]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((job) => {
      if (seasonFilter !== "all" && seasonKey(job) !== seasonFilter) return false;
      if (!q) return true;
      return (
        job.title.toLowerCase().includes(q) ||
        job.company.toLowerCase().includes(q)
      );
    });
  }, [items, search, seasonFilter]);

  const groups = useMemo(() => {
    const bySeason = new Map<string, TrackedJob[]>();
    for (const job of filtered) {
      const key = seasonKey(job);
      if (!bySeason.has(key)) bySeason.set(key, []);
      bySeason.get(key)!.push(job);
    }
    return [...bySeason.entries()]
      .sort(([a], [b]) => sortSeasons(a, b))
      .map(([season, jobsInSeason]) => ({ season, jobs: jobsInSeason }));
  }, [filtered]);

  const selected =
    items.find((job) => job.id === selectedId) ?? filtered[0] ?? null;

  async function persist(id: string, patch: Partial<TrackedJob>) {
    // Optimistic local update so the pane reflects the change instantly.
    setItems((prev) =>
      prev.map((job) => (job.id === id ? { ...job, ...patch } : job)),
    );
    const supabase = createClient();
    const dbPatch: { status?: string; season?: string | null } = {};
    if (patch.status !== undefined) dbPatch.status = patch.status;
    if (patch.season !== undefined) dbPatch.season = patch.season;
    const { error } = await supabase
      .from("tracked_jobs")
      .update(dbPatch)
      .eq("id", id);
    if (error) {
      // Roll back to server truth on failure.
      router.refresh();
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex h-[calc(100vh-11rem)] min-h-[32rem] flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      {/* Top bar */}
      <div className="flex flex-wrap items-center gap-3 border-b border-border bg-muted/30 px-4 py-3">
        <div className="flex items-center gap-2 font-semibold">
          <span className="grid size-6 place-items-center rounded bg-emerald-600 text-[11px] text-white">
            JT
          </span>
          <span className="text-sm">Job Tracker</span>
        </div>
        <div className="flex items-center gap-2">
          <StatPill label="Total" value={stats.total} />
          <StatPill label="Active" value={stats.active} />
          <StatPill label="Offers" value={stats.offers} />
        </div>
        <div className="relative ml-auto w-full max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search title or company…"
            className="h-9 pl-8"
          />
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        {/* Season rail */}
        <nav className="hidden w-52 shrink-0 flex-col gap-0.5 border-r border-border bg-muted/20 p-2 sm:flex">
          <RailItem
            label="All applications"
            count={items.length}
            active={seasonFilter === "all"}
            onClick={() => setSeasonFilter("all")}
          />
          {SEASON_ORDER.map((season) => (
            <RailItem
              key={season}
              label={season}
              count={seasonCounts.get(season) ?? 0}
              active={seasonFilter === season}
              onClick={() => setSeasonFilter(season)}
            />
          ))}
        </nav>

        {/* List pane */}
        <div className="flex w-full min-w-0 flex-col border-r border-border sm:w-[22rem] sm:shrink-0">
          <div className="flex items-center justify-between border-b border-border px-3 py-2 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Applications</span>
            <span>{filtered.length} items</span>
          </div>
          <ScrollArea className="flex-1">
            {groups.length === 0 ? (
              <EmptyState hasAny={items.length > 0} />
            ) : (
              groups.map((group) => (
                <div key={group.season}>
                  <div className="sticky top-0 z-10 bg-muted/60 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground backdrop-blur">
                    {group.season}
                  </div>
                  {group.jobs.map((job) => (
                    <ListRow
                      key={job.id}
                      job={job}
                      active={selected?.id === job.id}
                      onClick={() => setSelectedId(job.id)}
                    />
                  ))}
                </div>
              ))
            )}
          </ScrollArea>
        </div>

        {/* Reading pane */}
        <div className="hidden min-w-0 flex-1 sm:block">
          {selected ? (
            <ReadingPane job={selected} onPatch={persist} />
          ) : (
            <div className="grid h-full place-items-center text-sm text-muted-foreground">
              Select an application to view details
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatPill({ label, value }: { label: string; value: number }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-0.5 text-xs">
      <span className="font-semibold">{value}</span>
      <span className="text-muted-foreground">{label}</span>
    </span>
  );
}

function RailItem({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center justify-between rounded-md px-2.5 py-1.5 text-left text-sm transition-colors",
        active
          ? "bg-background font-medium text-foreground shadow-sm"
          : "text-muted-foreground hover:bg-background/60 hover:text-foreground",
      )}
    >
      <span className="truncate">{label}</span>
      <span className="ml-2 shrink-0 text-xs text-muted-foreground">{count}</span>
    </button>
  );
}

function ListRow({
  job,
  active,
  onClick,
}: {
  job: TrackedJob;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-start gap-3 border-b border-border px-3 py-2.5 text-left transition-colors",
        active ? "bg-accent" : "hover:bg-muted/50",
      )}
    >
      <span
        className={cn(
          "mt-0.5 grid size-8 shrink-0 place-items-center rounded-full text-xs font-semibold",
          avatarClasses(job.company),
        )}
      >
        {initials(job.company)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center justify-between gap-2">
          <span className="truncate text-sm font-semibold">{job.company}</span>
          <span className="shrink-0 text-[11px] text-muted-foreground">
            {formatShortDate(job.appliedAt)}
          </span>
        </span>
        <span className="block truncate text-sm text-foreground/90">{job.title}</span>
        <span className="mt-1 flex items-center gap-2">
          <TrackerStatusBadge status={job.status} />
          {job.description ? (
            <span className="truncate text-[11px] text-muted-foreground">
              {job.description.replace(/\s+/g, " ").trim()}
            </span>
          ) : null}
        </span>
      </span>
    </button>
  );
}

function ReadingPane({
  job,
  onPatch,
}: {
  job: TrackedJob;
  onPatch: (id: string, patch: Partial<TrackedJob>) => void;
}) {
  return (
    <ScrollArea className="h-full">
      <div className="space-y-5 p-6">
        <div className="flex items-start gap-3">
          <span
            className={cn(
              "grid size-11 shrink-0 place-items-center rounded-full text-sm font-semibold",
              avatarClasses(job.company),
            )}
          >
            {initials(job.company)}
          </span>
          <div className="min-w-0">
            <h2 className="text-lg font-semibold leading-tight">{job.title}</h2>
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Building2 className="size-3.5" />
              {job.company}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
          <TrackerStatusBadge status={job.status} />
          <span>Applied {formatShortDate(job.appliedAt)}</span>
          {job.season ? <span>{job.season}</span> : null}
          {job.location ? <span>{job.location}</span> : null}
          {job.sourceHost ? (
            <span className="inline-flex items-center gap-1">
              <Globe className="size-3.5" />
              {job.sourceHost}
            </span>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-4">
          <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
            Status
            <Select
              value={job.status}
              onChange={(e) =>
                onPatch(job.id, { status: e.target.value as TrackedJobStatus })
              }
              className="w-40"
            >
              {TRACKED_JOB_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {trackedJobStatusLabels[status]}
                </option>
              ))}
            </Select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
            Season
            <Select
              value={job.season ?? ""}
              onChange={(e) =>
                onPatch(job.id, { season: e.target.value || null })
              }
              className="w-40"
            >
              <option value="">Unassigned</option>
              {TRACKED_JOB_SEASONS.map((season) => (
                <option key={season} value={season}>
                  {season}
                </option>
              ))}
            </Select>
          </label>
        </div>

        <section className="space-y-1.5">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Job description
          </h3>
          <p className="whitespace-pre-wrap text-sm leading-6 text-foreground/90">
            {job.description?.trim() || "No description captured."}
          </p>
        </section>

        {job.notes?.trim() ? (
          <section className="space-y-1.5">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Notes
            </h3>
            <p className="whitespace-pre-wrap text-sm leading-6 text-foreground/90">
              {job.notes}
            </p>
          </section>
        ) : null}
      </div>
    </ScrollArea>
  );
}

function EmptyState({ hasAny }: { hasAny: boolean }) {
  return (
    <div className="grid place-items-center gap-2 px-6 py-16 text-center text-sm text-muted-foreground">
      <Inbox className="size-8 text-muted-foreground/60" />
      <p className="font-medium text-foreground">No tracked jobs</p>
      <p className="max-w-xs text-xs">
        {hasAny
          ? "No applications match your search or season filter."
          : "Capture jobs with the JobTrack browser extension and they'll show up here."}
      </p>
    </div>
  );
}
