import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft, Save } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { applicationStatuses, type JobApplication } from "@/lib/applications/types";
import { statusLabels } from "@/lib/applications/status";
import { cn } from "@/lib/utils";

type ApplicationFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  application?: JobApplication;
  submitLabel: string;
  title: string;
  description: string;
  cancelHref: string;
};

export function ApplicationForm({
  action,
  application,
  submitLabel,
  title,
  description,
  cancelHref,
}: ApplicationFormProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <Link
            href={cancelHref}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            <ArrowLeft className="size-4" />
            Back
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <form action={action} className="grid gap-6">
          {application ? (
            <input type="hidden" name="application_id" value={application.id} />
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Company name" htmlFor="company_name" required>
              <Input
                id="company_name"
                name="company_name"
                defaultValue={application?.companyName}
                placeholder="Acme Corp"
                required
              />
            </Field>
            <Field label="Job title" htmlFor="job_title" required>
              <Input
                id="job_title"
                name="job_title"
                defaultValue={application?.jobTitle}
                placeholder="Product Manager"
                required
              />
            </Field>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Job URL" htmlFor="job_url">
              <Input
                id="job_url"
                name="job_url"
                defaultValue={application?.jobUrl ?? ""}
                placeholder="https://company.com/careers/role"
                type="url"
              />
            </Field>
            <Field label="Location" htmlFor="location">
              <Input
                id="location"
                name="location"
                defaultValue={application?.location ?? ""}
                placeholder="Remote, New York, Toronto"
              />
            </Field>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Application date" htmlFor="applied_at">
              <Input
                id="applied_at"
                name="applied_at"
                defaultValue={application?.appliedAt ?? ""}
                type="date"
              />
            </Field>
            <Field label="Status" htmlFor="status" required>
              <Select
                id="status"
                name="status"
                defaultValue={application?.status ?? "saved"}
                required
              >
                {applicationStatuses.map((status) => (
                  <option key={status} value={status}>
                    {statusLabels[status]}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <Field label="Job description" htmlFor="job_description">
            <Textarea
              id="job_description"
              name="job_description"
              defaultValue={application?.jobDescription ?? ""}
              placeholder="Paste the role description or key requirements."
            />
          </Field>

          <Field label="Notes" htmlFor="notes">
            <Textarea
              id="notes"
              name="notes"
              defaultValue={application?.notes ?? ""}
              placeholder="Follow-up dates, recruiter notes, interview prep, compensation details."
            />
          </Field>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Link
              href={cancelHref}
              className={cn(buttonVariants({ variant: "outline" }))}
            >
              Cancel
            </Link>
            <Button type="submit">
              <Save className="size-4" />
              {submitLabel}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

type FieldProps = {
  label: string;
  htmlFor: string;
  required?: boolean;
  children: ReactNode;
};

function Field({ label, htmlFor, required, children }: FieldProps) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={htmlFor}>
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </Label>
      {children}
    </div>
  );
}
