import Link from "next/link";
import { ChevronDown } from "lucide-react";

import { createLatexDocumentAction } from "@/app/(app)/documents/actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
    <Card className="shadow-paper">
      <CardContent className="pt-5">
        <div className="mb-5">
          <h2 className="text-lg font-semibold">New LaTeX {label}</h2>
          <p className="mt-1 text-sm text-muted-foreground">Create the source here, then open a copy in Overleaf.</p>
        </div>
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
        <form action={createLatexDocumentAction} className="grid gap-4">
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
            <legend className="mb-2 text-sm font-medium">Start with</legend>
            <RadioGroup name="template_id" defaultValue={defaultLatexTemplateId(kind)} className="grid gap-2 sm:grid-cols-2">
              {templates.map((template) => (
                <label
                  key={template.id}
                  htmlFor={`latex-template-${template.id}`}
                  className="grid cursor-pointer grid-cols-[auto_1fr] gap-3 rounded-lg border border-border bg-card p-3 has-data-[state=checked]:border-primary has-data-[state=checked]:ring-2 has-data-[state=checked]:ring-primary/20"
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
          <details className="group rounded-lg border border-border">
            <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2.5 text-sm font-medium [&::-webkit-details-marker]:hidden">
              Use existing LaTeX source
              <ChevronDown aria-hidden className="size-4 text-muted-foreground transition-transform group-open:rotate-180" />
            </summary>
            <div className="grid gap-4 border-t border-border p-3">
              <div className="grid gap-1.5">
                <Label htmlFor="tex_file">Upload a .tex file</Label>
                <Input id="tex_file" name="tex_file" type="file" accept=".tex,text/x-tex,application/x-tex,text/plain" />
              </div>
              <div className="grid gap-1.5">
                <div className="flex items-end justify-between gap-3"><Label htmlFor="source">Or paste source</Label><span className="text-xs text-muted-foreground">Overrides the template</span></div>
                <Textarea id="source" name="source" placeholder="Paste LaTeX source" className="min-h-40 font-mono text-[0.82rem] leading-6" />
              </div>
            </div>
          </details>
          <div className="flex flex-wrap gap-2">
            <SubmitButton
              type="submit"
              className="h-10"
              pendingLabel="Creating…"
              disabled={!master && applications.length === 0}
            >
              Create project
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
