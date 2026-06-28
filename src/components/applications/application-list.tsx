import Link from "next/link";

import { ApplicationBoard } from "@/components/applications/application-board";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
  const boardKey = applications
    .map((application) => `${application.id}:${application.status}`)
    .join("|");

  return (
    <div className="grid gap-5">
      <Card>
        <CardContent className="pt-6">
          <form className="grid gap-3 md:grid-cols-[1fr_220px_auto_auto]">
            <Input
              name="q"
              defaultValue={query}
              placeholder="Search company or job title"
            />
            <Select name="status" defaultValue={status}>
              <option value="all">All statuses</option>
              {applicationStatuses.map((item) => (
                <option key={item} value={item}>
                  {statusLabels[item]}
                </option>
              ))}
            </Select>
            <Button type="submit">Search</Button>
            <Link
              href="/applications"
              className={cn(buttonVariants({ variant: "outline" }))}
            >
              Reset
            </Link>
          </form>
        </CardContent>
      </Card>

      <ApplicationBoard
        key={`${status}:${query}:${boardKey}`}
        applications={applications}
        visibleStatus={status}
      />
    </div>
  );
}
