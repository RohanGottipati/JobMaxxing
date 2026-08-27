import Link from "next/link";
import { Search } from "lucide-react";

import { ApplicationViews } from "@/components/applications/application-views";
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
      <form className="grid gap-2 rounded-xl border border-border bg-card p-2.5 shadow-paper sm:grid-cols-[minmax(0,1fr)_11rem_auto_auto] sm:items-center">
          <div className="relative">
            <Search aria-hidden className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              name="q"
              defaultValue={query}
              placeholder="Search company or job title"
              className="h-8 pl-8 text-[13px]"
            />
          </div>
            <Select name="status" defaultValue={status} className="h-8 text-[13px]">
              <option value="all">All statuses</option>
              {applicationStatuses.map((item) => (
                <option key={item} value={item}>
                  {statusLabels[item]}
                </option>
              ))}
            </Select>
            <Button type="submit" size="sm" className="h-8 px-4">
              Search
            </Button>
            <Link
              href="/applications"
              className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "h-8 px-4")}
            >
              Reset
            </Link>
      </form>

      <ApplicationViews
        key={`${status}:${query}:${boardKey}`}
        applications={applications}
        visibleStatus={status}
      />
    </div>
  );
}
