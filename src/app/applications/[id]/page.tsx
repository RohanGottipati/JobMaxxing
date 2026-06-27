import Link from "next/link";
import { notFound } from "next/navigation";
import type { ComponentType } from "react";
import {
  ArrowLeft,
  Calendar,
  ExternalLink,
  FileText,
  MapPin,
  Pencil,
  Trash2,
} from "lucide-react";

import { deleteApplication } from "@/app/applications/actions";
import {
  DocumentSection,
  StatusHistorySection,
} from "@/components/applications/application-detail-sections";
import { PlaceholderNotice } from "@/components/applications/placeholder-notice";
import { StatusBadge } from "@/components/applications/status-badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { getApplicationById } from "@/lib/applications/repository";
import { formatDate, formatDateTime } from "@/lib/applications/status";

type ApplicationDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ placeholder?: string }>;
};

export default async function ApplicationDetailPage({
  params,
  searchParams,
}: ApplicationDetailPageProps) {
  const user = await requireCurrentUser();
  const { id } = await params;
  const query = await searchParams;
  const application = await getApplicationById(user.id, id);

  if (!application) {
    notFound();
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <Link
            href="/applications"
            className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            <ArrowLeft className="size-4" />
            Applications
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-semibold tracking-tight">
              {application.companyName}
            </h1>
            <StatusBadge status={application.status} />
          </div>
          <p className="mt-2 text-lg text-muted-foreground">
            {application.jobTitle}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {application.jobUrl ? (
            <Link
              href={application.jobUrl}
              className={buttonVariants({ variant: "outline" })}
              target="_blank"
              rel="noreferrer"
            >
              <ExternalLink className="size-4" />
              Job post
            </Link>
          ) : null}
          <Link
            href={`/applications/${application.id}/edit`}
            className={buttonVariants()}
          >
            <Pencil className="size-4" />
            Edit
          </Link>
        </div>
      </div>

      <PlaceholderNotice value={query.placeholder} />

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Role details</CardTitle>
              <CardDescription>
                Main application fields from the MVP spec.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <InfoItem
                  icon={MapPin}
                  label="Location"
                  value={application.location ?? "Not set"}
                />
                <InfoItem
                  icon={Calendar}
                  label="Application date"
                  value={formatDate(application.appliedAt)}
                />
                <InfoItem
                  icon={Calendar}
                  label="Created"
                  value={formatDateTime(application.createdAt)}
                />
                <InfoItem
                  icon={Calendar}
                  label="Updated"
                  value={formatDateTime(application.updatedAt)}
                />
              </div>

              <Separator />

              <TextBlock
                title="Job description"
                value={application.jobDescription}
              />
              <TextBlock title="Notes" value={application.notes} />
            </CardContent>
          </Card>

          <DocumentSection application={application} />
        </div>

        <div className="grid content-start gap-6">
          <StatusHistorySection application={application} />

          <Card className="border-destructive/30">
            <CardHeader>
              <CardTitle>Delete application</CardTitle>
              <CardDescription>
                Placeholder action until Supabase persistence is connected.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form action={deleteApplication}>
                <input
                  type="hidden"
                  name="application_id"
                  value={application.id}
                />
                <Button type="submit" variant="destructive" className="w-full">
                  <Trash2 className="size-4" />
                  Delete application
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}

type InfoItemProps = {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
};

function InfoItem({ icon: Icon, label, value }: InfoItemProps) {
  return (
    <div className="rounded-md border p-3">
      <div className="flex items-center gap-2 text-xs font-medium uppercase text-muted-foreground">
        <Icon className="size-3.5" />
        {label}
      </div>
      <p className="mt-2 text-sm font-medium">{value}</p>
    </div>
  );
}

function TextBlock({ title, value }: { title: string; value: string | null }) {
  return (
    <div className="grid gap-2">
      <div className="flex items-center gap-2 text-sm font-medium">
        <FileText className="size-4 text-muted-foreground" />
        {title}
      </div>
      <div className="min-h-20 rounded-md border bg-muted/20 p-3 text-sm leading-6 text-muted-foreground">
        {value || "Not added yet."}
      </div>
    </div>
  );
}
