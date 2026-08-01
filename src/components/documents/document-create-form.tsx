import Link from "next/link";
import { FilePlus2, Files, FileText } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { SubmitButton } from "@/components/ui/submit-button";
import { Textarea } from "@/components/ui/textarea";
import type { ApplicationOption, MasterResumeItem } from "@/lib/documents/types";

export function DocumentCreateForm({
  kind,
  action,
  applications = [],
  masterResumes = [],
  defaultApplicationId,
  error,
}: {
  kind: "master_resume" | "resume_version" | "cover_letter";
  action: (formData: FormData) => void | Promise<void>;
  applications?: ApplicationOption[];
  masterResumes?: MasterResumeItem[];
  defaultApplicationId?: string;
  error?: string;
}) {
  const master = kind === "master_resume";
  const resumeVersion = kind === "resume_version";
  const label = master ? "master resume" : resumeVersion ? "tailored resume" : "cover letter";
  const backHref = kind === "cover_letter" ? "/cover-letters" : "/resumes";
  const Icon = master ? Files : resumeVersion ? FilePlus2 : FileText;

  return (
    <Card>
      <CardHeader className="border-b border-border bg-parchment/35">
        <span className="mb-3 grid size-9 place-items-center rounded-md border border-border bg-card text-primary"><Icon aria-hidden className="size-4" /></span>
        <CardTitle className="text-lg">Create {label}</CardTitle>
        <CardDescription>{master ? "Build a reusable source resume that can anchor tailored versions." : "Link this document to the opportunity it was created for."}</CardDescription>
      </CardHeader>
      <CardContent>
        {error ? <Alert variant="destructive" className="mb-5"><AlertDescription>{error === "application" ? "Choose an application you own." : "Complete the required fields and try again."}</AlertDescription></Alert> : null}
        {!master && applications.length === 0 ? <Alert className="mb-5"><AlertDescription>Create an application before adding an application-specific document.</AlertDescription></Alert> : null}
        <form action={action} className="grid gap-5">
          {!master ? <div className="grid gap-1.5"><Label htmlFor="application_id">Application</Label><Select id="application_id" name="application_id" defaultValue={defaultApplicationId ?? ""} required><option value="" disabled>Select an application</option>{applications.map((application) => <option key={application.id} value={application.id}>{application.companyName} · {application.jobTitle}</option>)}</Select></div> : null}
          {resumeVersion ? <div className="grid gap-1.5"><Label htmlFor="base_resume_id">Master resume</Label><Select id="base_resume_id" name="base_resume_id" defaultValue={masterResumes.find((resume) => resume.is_default)?.id ?? ""}><option value="">No master resume</option>{masterResumes.map((resume) => <option key={resume.id} value={resume.id}>{resume.name}{resume.is_default ? " (default)" : ""}</option>)}</Select></div> : null}
          <div className="grid gap-1.5"><Label htmlFor="document-title">{master ? "Name" : "Title"}</Label><Input id="document-title" name={master ? "name" : "title"} placeholder={master ? "Product engineering master" : resumeVersion ? "Tailored for the platform team" : "Platform team cover letter"} maxLength={160} required /></div>
          <div className="grid gap-1.5"><div className="flex items-end justify-between gap-3"><Label htmlFor="content">Text content</Label><span className="text-xs text-muted-foreground">You can attach a private file after creation</span></div><Textarea id="content" name="content" placeholder="Paste or write the document content." className="paper-rule min-h-72 font-mono text-[0.82rem] leading-6" /></div>
          <div className="flex flex-wrap gap-2"><SubmitButton type="submit" className="h-10" pendingLabel="Creating…" disabled={!master && applications.length === 0}>Create {label}</SubmitButton><Link href={backHref} className={buttonVariants({ variant: "outline", size: "lg" })}>Cancel</Link></div>
        </form>
      </CardContent>
    </Card>
  );
}
