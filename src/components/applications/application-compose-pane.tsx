"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  FileText,
  Loader2,
  Paperclip,
  Save,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import { toast } from "sonner";

import {
  createApplication,
  createApplicationFromComposer,
} from "@/app/(app)/applications/actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { applicationStatuses, type ApplicationStatus } from "@/lib/applications/types";
import { statusLabels } from "@/lib/applications/status";
import { DOCUMENT_BUCKET } from "@/lib/documents/constants";
import {
  DOCUMENT_FILE_ACCEPT,
  documentContentType,
  safeDocumentFileName,
  validateDocumentFile,
} from "@/lib/documents/upload-policy";
import { createClient } from "@/lib/supabase/client";

type ApplicationComposePaneProps = {
  defaultStatus?: ApplicationStatus;
  error?: string | null;
  onClose: () => void;
};

export function ApplicationComposePane({
  defaultStatus = "saved",
  error,
  onClose,
}: ApplicationComposePaneProps) {
  const router = useRouter();
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [coverLetterFile, setCoverLetterFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  async function submitComposer(form: HTMLFormElement) {
    if (isSaving || !form.reportValidity()) return;

    for (const file of [resumeFile, coverLetterFile]) {
      if (!file) continue;
      const validationError = validateDocumentFile(file);
      if (validationError) {
        setLocalError(`${file.name}: ${validationError}`);
        return;
      }
    }

    setIsSaving(true);
    setLocalError(null);
    const supabase = createClient();
    const uploadedPaths: string[] = [];

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError || !user) throw new Error("Your session expired. Sign in and try again.");

      const formData = new FormData(form);
      for (const [kind, file] of [
        ["submitted_resume", resumeFile],
        ["submitted_cover_letter", coverLetterFile],
      ] as const) {
        if (!file) continue;
        const contentType = documentContentType(file);
        if (!contentType) throw new Error(`${file.name} must be a PDF or DOCX file.`);
        const path = `${user.id}/application-packages/${crypto.randomUUID()}-${safeDocumentFileName(file.name)}`;
        const { error: uploadError } = await supabase.storage
          .from(DOCUMENT_BUCKET)
          .upload(path, file, { contentType, upsert: false });
        if (uploadError) throw uploadError;
        uploadedPaths.push(path);
        formData.set(`${kind}_path`, path);
        formData.set(`${kind}_name`, file.name);
      }

      const result = await createApplicationFromComposer(formData);
      if (!result.ok) {
        const messages = {
          "duplicate-description": "A role with this job description is already tracked.",
          "invalid-package": "The uploaded application package could not be verified.",
          "missing-required": "Company and role title are required.",
          "save-failed": "The role or its application package could not be saved.",
        };
        throw new Error(messages[result.error]);
      }

      toast.success(uploadedPaths.length ? "Application and files saved" : "Application saved");
      router.push(`/applications?id=${result.applicationId}`);
      router.refresh();
    } catch (submitError) {
      if (uploadedPaths.length) {
        await supabase.storage.from(DOCUMENT_BUCKET).remove(uploadedPaths);
      }
      setLocalError(
        submitError instanceof Error ? submitError.message : "The application could not be saved.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form
      action={createApplication}
      className="motion-rise flex h-full min-h-0 flex-col bg-background"
      onSubmit={(event) => {
        event.preventDefault();
        void submitComposer(event.currentTarget);
      }}
      onKeyDown={(event) => {
        if ((event.metaKey || event.ctrlKey) && (event.key === "Enter" || event.key === "NumpadEnter")) {
          event.preventDefault();
          event.currentTarget.requestSubmit();
        }
      }}
    >
      <input type="hidden" name="form_context" value="mailbox" />

      <header className="flex shrink-0 items-center gap-3 border-b border-border bg-parchment/35 px-3 py-2.5 sm:px-4">
        <Button type="button" variant="ghost" size="icon-sm" aria-label="Close new application" onClick={onClose}>
          <X aria-hidden />
        </Button>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold">Add application</h2>
          <p className="hidden text-xs text-muted-foreground sm:block">Only the company and role are required.</p>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto grid w-full max-w-3xl gap-4 px-4 py-5 sm:px-6 sm:py-6">
          {error || localError ? (
            <Alert variant="destructive">
              <AlertDescription>
                {localError ?? (error === "duplicate-description"
                  ? "A role with this job description is already tracked."
                  : "Company and role title are required.")}
              </AlertDescription>
            </Alert>
          ) : null}

          <section className="grid gap-4 rounded-xl border border-border bg-elevated p-4 sm:p-5">
            <div>
              <h3 className="font-semibold">Role</h3>
              <p className="mt-1 text-xs text-muted-foreground">Save the basics now. Everything else can be added later.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Company" id="compose-company">
                <Input id="compose-company" name="company_name" placeholder="Company name" autoComplete="organization" autoFocus required />
              </Field>
              <Field label="Role title" id="compose-title">
                <Input id="compose-title" name="job_title" placeholder="Software Engineering Intern" required />
              </Field>
              <Field label="Status" id="compose-status">
                <Select id="compose-status" name="status" defaultValue={defaultStatus} required>
                  {applicationStatuses.map((status) => <option key={status} value={status}>{statusLabels[status]}</option>)}
                </Select>
              </Field>
              <Field label="Job link" id="compose-url">
                <Input id="compose-url" name="job_url" type="url" placeholder="https://company.com/jobs/..." />
              </Field>
            </div>
            <Field label="Job description" id="compose-description" hint="Paste it before the posting disappears.">
              <Textarea id="compose-description" name="job_description" placeholder="Paste the job description" className="min-h-44 resize-y leading-6" />
            </Field>
            <Field label="Next action" id="compose-next-action">
              <Input id="compose-next-action" name="next_action" placeholder="Submit by Friday, email recruiter, prepare for interview…" />
            </Field>
          </section>

          <details className="group rounded-xl border border-border bg-elevated">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold [&::-webkit-details-marker]:hidden">
              Dates, location and notes
              <ChevronDown aria-hidden className="size-4 text-muted-foreground transition-transform group-open:rotate-180" />
            </summary>
            <div className="grid gap-4 border-t border-border p-4 sm:grid-cols-2">
              <Field label="Location" id="compose-location"><Input id="compose-location" name="location" placeholder="Remote or city" /></Field>
              <Field label="Referral" id="compose-referral"><Input id="compose-referral" name="referral_contact" placeholder="Name or contact" /></Field>
              <Field label="Applied date" id="compose-applied"><Input id="compose-applied" name="applied_at" type="date" /></Field>
              <Field label="Deadline" id="compose-deadline"><Input id="compose-deadline" name="deadline" type="date" /></Field>
              <div className="sm:col-span-2">
                <Field label="Private notes" id="compose-notes"><Textarea id="compose-notes" name="notes" placeholder="Recruiter context, interview notes, or compensation details" className="min-h-28 resize-y" /></Field>
              </div>
            </div>
          </details>

          <details className="group rounded-xl border border-border bg-elevated">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold [&::-webkit-details-marker]:hidden">
              <span className="flex items-center gap-2"><Paperclip aria-hidden className="size-4" />Submitted files <span className="font-normal text-muted-foreground">(optional)</span></span>
              <ChevronDown aria-hidden className="size-4 text-muted-foreground transition-transform group-open:rotate-180" />
            </summary>
            <div className="grid gap-3 border-t border-border p-4 sm:grid-cols-2">
              <PackageFileInput id="compose-resume-file" label="Resume used" file={resumeFile} onChange={setResumeFile} disabled={isSaving} />
              <PackageFileInput id="compose-cover-letter-file" label="Cover letter used" file={coverLetterFile} onChange={setCoverLetterFile} disabled={isSaving} />
              <p className="text-[11px] leading-5 text-muted-foreground sm:col-span-2">PDF or DOCX, up to 10 MB each. Submitted copies stay attached to this application.</p>
            </div>
          </details>

          <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:items-center sm:justify-between">
            <p className="hidden text-xs text-muted-foreground sm:block">⌘ Enter also saves</p>
            <div className="flex gap-2 sm:ml-auto">
              <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>Cancel</Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? <Loader2 aria-hidden className="animate-spin" /> : <Save aria-hidden />}
                {isSaving ? "Saving…" : "Save application"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}

function PackageFileInput({
  disabled,
  file,
  id,
  label,
  onChange,
}: {
  disabled: boolean;
  file: File | null;
  id: string;
  label: string;
  onChange: (file: File | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="rounded-lg border border-border bg-parchment/20 p-3">
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept={DOCUMENT_FILE_ACCEPT}
        className="sr-only"
        disabled={disabled}
        onChange={(event) => {
          const nextFile = event.target.files?.[0] ?? null;
          if (nextFile) {
            const validationError = validateDocumentFile(nextFile);
            if (validationError) {
              toast.error(validationError);
              event.target.value = "";
              return;
            }
          }
          onChange(nextFile);
        }}
      />

      <div className="flex items-center gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-md border border-border bg-background text-primary">
          <FileText aria-hidden className="size-4" />
        </span>
        <span className="min-w-0 flex-1">
          <Label htmlFor={id} className="block text-xs font-semibold">{label}</Label>
          <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
            {file ? `${file.name} · ${formatFileSize(file.size)}` : "No file attached"}
          </span>
        </span>
        {file ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            disabled={disabled}
            aria-label={`Remove ${label.toLowerCase()}`}
            onClick={() => {
              onChange(null);
              if (inputRef.current) inputRef.current.value = "";
            }}
          >
            <Trash2 aria-hidden />
          </Button>
        ) : (
          <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={() => inputRef.current?.click()}>
            <UploadCloud aria-hidden /> Upload
          </Button>
        )}
      </div>
    </div>
  );
}

function Field({
  children,
  hint,
  id,
  label,
}: {
  children: React.ReactNode;
  hint?: string;
  id: string;
  label: string;
}) {
  return (
    <div className="grid gap-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <Label htmlFor={id}>{label}</Label>
        {hint ? <span className="text-[11px] text-muted-foreground">{hint}</span> : null}
      </div>
      {children}
    </div>
  );
}

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
