import Link from "next/link";

import { PipelineTimeline } from "@/components/dashboard/pipeline-timeline";
import { DashboardWidgets } from "@/components/dashboard/dashboard-widgets";
import { Progress, ProgressValue } from "@/components/ui/progress";
import {
  getDisplayName,
  getPipelineProgress,
  getPipelineSteps,
  getTargetCompanies,
  getTimeGreeting,
} from "@/lib/dashboard/helpers";
import type { ApplicationStatus, JobApplication } from "@/lib/applications/types";

type DashboardHomeProps = {
  email?: string | null;
  isPreview?: boolean;
  total: number;
  active: number;
  byStatus: Record<ApplicationStatus, number>;
  recent: JobApplication[];
};

export function DashboardHome({
  email,
  isPreview,
  total,
  active,
  byStatus,
  recent,
}: DashboardHomeProps) {
  const steps = getPipelineSteps({ total, active, byStatus });
  const progress = getPipelineProgress(steps);
  const companies = getTargetCompanies(recent);
  const name = getDisplayName(email, isPreview);

  const headline =
    byStatus.offer > 0
      ? "You have offers on the table."
      : active > 0
        ? "You're moving roles through your pipeline."
        : total > 0
          ? "Your pipeline is ready — start applying."
          : "Build your job search pipeline.";

  return (
    <div className="flex flex-1 flex-col gap-8 p-4 md:p-6 lg:p-8">
      <div className="flex flex-col gap-8 xl:flex-row xl:items-start">
        <div className="min-w-0 flex-1 space-y-8">
          <header className="space-y-5">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">
              {getTimeGreeting()}, {name}
            </p>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-4 text-xs text-muted-foreground">
                <span>Pipeline progress</span>
                <span>{progress.label}</span>
              </div>
              <Progress value={progress.percent} className="gap-0">
                <ProgressValue />
              </Progress>
            </div>

            <h1 className="text-3xl font-medium leading-tight tracking-tight sm:text-4xl">
              {headline}
            </h1>
          </header>

          {companies.length > 0 ? (
            <section className="space-y-3">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">
                Targeting
              </p>
              <p className="text-sm text-muted-foreground">
                {companies.join(" · ")}
                {total > companies.length ? ` · +${total - companies.length} more` : ""}
              </p>
            </section>
          ) : null}

          <section className="space-y-6">
            <PipelineTimeline steps={steps} />
          </section>
        </div>

        <DashboardWidgets total={total} active={active} byStatus={byStatus} />
      </div>

      {recent.length > 0 ? (
        <section className="space-y-3 border-t border-border pt-8">
          <div className="flex items-center justify-between gap-4">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">
              Recent
            </p>
            <Link href="/applications" className="text-sm underline underline-offset-4">
              View all
            </Link>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {recent.map((application) => (
              <Link
                key={application.id}
                href={`/applications/${application.id}`}
                className="rounded-lg border border-border p-4 hover:bg-muted/30"
              >
                <p className="truncate font-medium">{application.companyName}</p>
                <p className="mt-1 truncate text-sm text-muted-foreground">
                  {application.jobTitle}
                </p>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
