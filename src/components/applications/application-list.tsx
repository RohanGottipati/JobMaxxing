import Link from "next/link";

import { ApplicationBoard } from "@/components/applications/application-board";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  applicationStatuses,
  type ApplicationStatus,
  type JobApplication,
} from "@/lib/applications/types";
import { statusLabels } from "@/lib/applications/status";
import { cn } from "@/lib/utils";

type ApplicationListProps = {
  applications: JobApplication[];
  query?: string;
  status?: ApplicationStatus | "all";
};

export function ApplicationList({
  applications,
  query = "",
  status = "all",
}: ApplicationListProps) {
  // Remount only when the *set* of applications changes (create/delete) or the filters
  // change — never on status/position changes, so drag reorders keep their optimistic state.
  const boardKey = applications
    .map((application) => application.id)
    .sort()
    .join("|");

  return (
    <div className="grid gap-5">
      <form className="grid gap-2 rounded-lg border border-border/70 bg-card p-3 shadow-xs sm:grid-cols-[minmax(0,1fr)_12rem_auto_auto] sm:items-center">
            <Input
              name="q"
              defaultValue={query}
              placeholder="Search company or job title"
              className="h-9"
            />
            <Select name="status" defaultValue={status}>
              <option value="all">All statuses</option>
              {applicationStatuses.map((item) => (
                <option key={item} value={item}>
                  {statusLabels[item]}
                </option>
              ))}
            </Select>
            <Button type="submit" size="sm">
              Search
            </Button>
            <Link
              href="/applications"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              Reset
            </Link>
      </form>

      <ApplicationBoard
        key={`${status}:${query}:${boardKey}`}
        applications={applications}
        visibleStatus={status}
      />
    </div>
  );
}
