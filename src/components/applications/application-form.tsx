import Link from "next/link";
import type { ReactNode } from "react";

import { buttonVariants } from "@/components/ui/button";
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
import { SubmitButton } from "@/components/ui/submit-button";
import { Textarea } from "@/components/ui/textarea";
import {
  applicationStatuses,
  type ApplicationStatus,
  type JobApplication,
} from "@/lib/applications/types";
import { statusLabels } from "@/lib/applications/status";
import { cn } from "@/lib/utils";

type ApplicationFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  application?: JobApplication;
  defaultStatus?: ApplicationStatus;
  submitLabel: string;
  title: string;
  description: string;
  cancelHref: string;
};

export function ApplicationForm({
  action,
  application,
  defaultStatus = "saved",
  submitLabel,
  title,
  description,
  cancelHref,
}: ApplicationFormProps) {
  const selectedStatus = application?.status ?? defaultStatus;

  return (
    <Card>
      <CardHeader className="border-b border-border bg-parchment/35">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <Link
            href={cancelHref}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Back
          </Link>
        </div>
      </CardHeader>
      <CardContent className="pt-1">
        <form action={action} className="grid gap-5">
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
                placeholder="Remote, Toronto, or New York"
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
              <Select id="status" name="status" defaultValue={selectedStatus} required>
                {applicationStatuses.map((status) => (
                  <option key={status} value={status}>
                    {statusLabels[status]}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Deadline" htmlFor="deadline">
              <Input
                id="deadline"
                name="deadline"
                defaultValue={application?.deadline ?? ""}
                type="date"
              />
            </Field>
            <Field label="Referral contact" htmlFor="referral_contact">
              <Input
                id="referral_contact"
                name="referral_contact"
                defaultValue={application?.referralContact ?? ""}
                placeholder="Name, email, or relationship"
              />
            </Field>
          </div>

          <Field label="Next action" htmlFor="next_action">
            <Input
              id="next_action"
              name="next_action"
              defaultValue={application?.nextAction ?? ""}
              placeholder="e.g. Follow up with recruiter on Tuesday"
            />
          </Field>

          <Field label="Job description" htmlFor="job_description">
            <Textarea
              id="job_description"
              name="job_description"
              defaultValue={application?.jobDescription ?? ""}
              placeholder="Paste the role description or key requirements."
              className="paper-rule min-h-44"
            />
          </Field>

          <Field label="Notes" htmlFor="notes">
            <Textarea
              id="notes"
              name="notes"
              defaultValue={application?.notes ?? ""}
              placeholder="Follow-up dates, recruiter notes, interview prep, compensation details."
              className="paper-rule min-h-36"
            />
          </Field>

          <div className="flex gap-3 pt-2">
            <SubmitButton type="submit" pendingLabel="Saving..." className="h-10">
              {submitLabel}
            </SubmitButton>
            <Link
              href={cancelHref}
              className={cn(buttonVariants({ variant: "outline" }), "h-10")}
            >
              Cancel
            </Link>
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
      <Label htmlFor={htmlFor} className="text-sm font-medium">
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </Label>
      {children}
    </div>
  );
}
