import Link from "next/link";
import type { ComponentType } from "react";
import { Briefcase, Clock3, Send, Trophy } from "lucide-react";

import { StatusBadge } from "@/components/applications/status-badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { applicationStatuses, type ApplicationStatus, type JobApplication } from "@/lib/applications/types";
import {
  formatDate,
  statusDescriptions,
  statusLabels,
} from "@/lib/applications/status";

type DashboardSummaryProps = {
  total: number;
  active: number;
  byStatus: Record<ApplicationStatus, number>;
  recent: JobApplication[];
};

export function DashboardSummary({
  total,
  active,
  byStatus,
  recent,
}: DashboardSummaryProps) {
  return (
    <div className="grid gap-6">
      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard
          title="Total"
          value={total}
          description="Tracked applications"
          icon={Briefcase}
        />
        <MetricCard
          title="Active"
          value={active}
          description="Applied or interviewing"
          icon={Clock3}
        />
        <MetricCard
          title="Interviewing"
          value={byStatus.interviewing}
          description="Open interview loops"
          icon={Send}
        />
        <MetricCard
          title="Offers"
          value={byStatus.offer}
          description="Current offer outcomes"
          icon={Trophy}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <Card>
          <CardHeader>
            <CardTitle>Status breakdown</CardTitle>
            <CardDescription>
              Current count across the five MVP statuses.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {applicationStatuses.map((status) => (
              <div
                key={status}
                className="flex items-center justify-between gap-3 rounded-md border p-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <StatusBadge status={status} />
                    <span className="text-sm font-medium">
                      {statusLabels[status]}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {statusDescriptions[status]}
                  </p>
                </div>
                <span className="text-2xl font-semibold">{byStatus[status]}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
            <div>
              <CardTitle>Recently added</CardTitle>
              <CardDescription>
                The newest roles in the application tracker.
              </CardDescription>
            </div>
            <Link
              href="/applications"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              View all
            </Link>
          </CardHeader>
          <CardContent className="grid gap-3">
            {recent.map((application) => (
              <Link
                key={application.id}
                href={`/applications/${application.id}`}
                className="grid gap-2 rounded-md border p-3 transition-colors hover:bg-muted/40"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">{application.companyName}</span>
                  <StatusBadge status={application.status} />
                </div>
                <p className="text-sm text-muted-foreground">
                  {application.jobTitle}
                </p>
                <p className="text-xs text-muted-foreground">
                  Applied {formatDate(application.appliedAt)}
                </p>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

type MetricCardProps = {
  title: string;
  value: number;
  description: string;
  icon: ComponentType<{ className?: string }>;
};

function MetricCard({ title, value, description, icon: Icon }: MetricCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="size-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-semibold">{value}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}
