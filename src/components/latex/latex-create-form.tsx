import Link from "next/link";
import { FileCode2 } from "lucide-react";

import { createLatexDocumentAction } from "@/app/(app)/documents/actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select } from "@/components/ui/select";
import { SubmitButton } from "@/components/ui/submit-button";
import { Textarea } from "@/components/ui/textarea";
import type { ApplicationOption, MasterResumeItem } from "@/lib/documents/types";
import type { LatexDocumentKind } from "@/lib/latex/constants";
import {
  defaultLatexTemplateId,
  latexTemplatesForKind,
} from "@/lib/latex/templates";

export function LatexCreateForm({
  kind,
  applications = [],
  masterResumes = [],
  defaultApplicationId,
  error,
  cancelHref,
  errorHref,
}: {
  kind: LatexDocumentKind;
  applications?: ApplicationOption[];
  masterResumes?: MasterResumeItem[];
  defaultApplicationId?: string;
  error?: string;
  cancelHref: string;
  /** Where validation failures should redirect. Defaults to the matching create page. */
  errorHref?: string;
}) {
  const master = kind === "master_resume";
  const resumeVersion = kind === "resume_version";
  const label = master ? "master resume" : resumeVersion ? "tailored resume" : "cover letter";
  const templates = latexTemplatesForKind(kind);
  const failureHref =
    errorHref ??
    (master
      ? "/resumes/new?mode=latex"
      : resumeVersion
        ? "/resumes/versions/new?mode=latex"
        : "/cover-letters/new?mode=latex");

  return (
    <Card className="overflow-hidden border-primary/15 shadow-paper">
      <CardHeader className="border-b border-border bg-[linear-gradient(120deg,color-mix(in_oklch,var(--primary),transparent_94%),transparent_70%)]">
        <span className="mb-3 grid size-9 place-items-center rounded-md border border-border bg-card text-primary">
          <FileCode2 aria-hidden className="size-4" />
        </span>
        <CardTitle className="text-lg">New LaTeX {label}</CardTitle>
        <CardDescription>
          Choose how to start, then import the project into Overleaf to edit and compile it.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error ? (
          <Alert variant="destructive" className="mb-5">
            <AlertDescription>
              {error === "application"
                ? "Choose an application you own."
                : "Complete the required fields and try again."}
            </AlertDescription>
          </Alert>
        ) : null}
        {!master && applications.length === 0 ? (
          <Alert className="mb-5">
            <AlertDescription>Create an application before adding an application-specific document.</AlertDescription>
          </Alert>
        ) : null}
        <form action={createLatexDocumentAction} className="grid gap-5">
          <input type="hidden" name="kind" value={kind} />
          <input type="hidden" name="error_href" value={failureHref} />
          {!master ? (
            <div className="grid gap-1.5">
              <Label htmlFor="application_id">Application</Label>
              <Select id="application_id" name="application_id" defaultValue={defaultApplicationId ?? ""} required>
                <option value="" disabled>
                  Select an application
                </option>
                {applications.map((application) => (
                  <option key={application.id} value={application.id}>
                    {application.companyName} · {application.jobTitle}
                  </option>
                ))}
              </Select>
            </div>
          ) : null}
          {resumeVersion ? (
            <div className="grid gap-1.5">
              <Label htmlFor="base_resume_id">Master resume</Label>
              <Select
                id="base_resume_id"
                name="base_resume_id"
                defaultValue={masterResumes.find((resume) => resume.is_default)?.id ?? ""}
              >
                <option value="">No master resume</option>
                {masterResumes.map((resume) => (
                  <option key={resume.id} value={resume.id}>
                    {resume.name}
                    {resume.is_default ? " (default)" : ""}
                  </option>
                ))}
              </Select>
            </div>
          ) : null}
          <div className="grid gap-1.5">
            <Label htmlFor="document-title">{master ? "Name" : "Title"}</Label>
            <Input
              id="document-title"
              name={master ? "name" : "title"}
              placeholder={
                master
                  ? "Product engineering master"
                  : resumeVersion
                    ? "Tailored LaTeX resume"
                    : "Platform team cover letter"
              }
              maxLength={160}
              required
            />
          </div>
          <fieldset>
            <legend className="mb-3 text-sm font-medium">Start from a template</legend>
            <RadioGroup name="template_id" defaultValue={defaultLatexTemplateId(kind)} className="grid gap-3">
              {templates.map((template) => (
                <label
                  key={template.id}
                  htmlFor={`latex-template-${template.id}`}
                  className="grid cursor-pointer grid-cols-[auto_1fr] gap-3 rounded-xl border border-border bg-card p-3 has-data-[state=checked]:border-primary has-data-[state=checked]:ring-2 has-data-[state=checked]:ring-primary/20"
                >
                  <RadioGroupItem id={`latex-template-${template.id}`} value={template.id} className="mt-1" />
                  <span>
                    <span className="block font-medium">{template.name}</span>
                    <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                      {template.description}
                    </span>
                  </span>
                </label>
              ))}
            </RadioGroup>
          </fieldset>
          <div className="grid gap-1.5">
            <Label htmlFor="tex_file">Or upload a .tex file</Label>
            <Input id="tex_file" name="tex_file" type="file" accept=".tex,text/x-tex,application/x-tex,text/plain" />
          </div>
          <div className="grid gap-1.5">
            <div className="flex items-end justify-between gap-3">
              <Label htmlFor="source">Or paste source</Label>
              <span className="text-xs text-muted-foreground">Replaces the template when provided</span>
            </div>
            <Textarea
              id="source"
              name="source"
              placeholder="Paste existing LaTeX here to skip the starter template."
              className="paper-rule min-h-40 font-mono text-[0.82rem] leading-6"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <SubmitButton
              type="submit"
              className="h-10"
              pendingLabel="Creating…"
              disabled={!master && applications.length === 0}
            >
              Continue to Overleaf
            </SubmitButton>
            <Link href={cancelHref} className={buttonVariants({ variant: "outline", size: "lg" })}>
              Cancel
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
