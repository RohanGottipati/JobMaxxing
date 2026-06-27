import Link from "next/link";
import { Calendar, ExternalLink, MapPin, Search } from "lucide-react";

import { StatusBadge } from "@/components/applications/status-badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { applicationStatuses, type JobApplication } from "@/lib/applications/types";
import { formatDate, formatDateTime, statusLabels } from "@/lib/applications/status";
import { cn } from "@/lib/utils";

type ApplicationListProps = {
  applications: JobApplication[];
  query?: string;
  status?: string;
};

export function ApplicationList({
  applications,
  query = "",
  status = "all",
}: ApplicationListProps) {
  return (
    <div className="grid gap-5">
      <Card>
        <CardContent className="pt-6">
          <form className="grid gap-3 md:grid-cols-[1fr_220px_auto_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                name="q"
                defaultValue={query}
                placeholder="Search company or job title"
                className="pl-9"
              />
            </div>
            <Select name="status" defaultValue={status}>
              <option value="all">All statuses</option>
              {applicationStatuses.map((item) => (
                <option key={item} value={item}>
                  {statusLabels[item]}
                </option>
              ))}
            </Select>
            <Button type="submit">
              <Search className="size-4" />
              Search
            </Button>
            <Link
              href="/applications"
              className={cn(buttonVariants({ variant: "outline" }))}
            >
              Reset
            </Link>
          </form>
        </CardContent>
      </Card>

      {applications.length ? (
        <div className="grid gap-3">
          {applications.map((application) => (
            <ApplicationRow key={application.id} application={application} />
          ))}
        </div>
      ) : (
        <Card>
          <CardHeader className="text-center">
            <CardTitle>No applications found</CardTitle>
            <CardDescription>
              Adjust the search or status filter, or add a new application.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center pb-8">
            <Link href="/applications/new" className={buttonVariants()}>
              Add application
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ApplicationRow({ application }: { application: JobApplication }) {
  return (
    <Card className="transition-colors hover:bg-muted/30">
      <CardContent className="grid gap-4 p-4 md:grid-cols-[1fr_auto] md:items-center">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/applications/${application.id}`}
              className="truncate text-base font-semibold underline-offset-4 hover:underline"
            >
              {application.companyName}
            </Link>
            <StatusBadge status={application.status} />
          </div>
          <p className="text-sm text-muted-foreground">{application.jobTitle}</p>
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-3.5" />
              {application.location ?? "Location not set"}
            </span>
            <span className="inline-flex items-center gap-1">
              <Calendar className="size-3.5" />
              Applied {formatDate(application.appliedAt)}
            </span>
            <span>Created {formatDateTime(application.createdAt)}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 md:justify-end">
          {application.jobUrl ? (
            <Link
              href={application.jobUrl}
              className={buttonVariants({ variant: "outline", size: "sm" })}
              target="_blank"
              rel="noreferrer"
            >
              <ExternalLink className="size-4" />
              Role
            </Link>
          ) : null}
          <Link
            href={`/applications/${application.id}`}
            className={buttonVariants({ size: "sm" })}
          >
            View
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
