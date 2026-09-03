"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import {
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  FileText,
  Link2,
  Loader2,
  MapPin,
  NotebookPen,
  Paperclip,
  Save,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react"
import { toast } from "sonner"

import {
  createApplication,
  createApplicationFromComposer,
} from "@/app/(app)/applications/actions"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { applicationStatuses, type ApplicationStatus } from "@/lib/applications/types"
import { statusLabels } from "@/lib/applications/status"
import { createClient } from "@/lib/supabase/client"
import { DOCUMENT_BUCKET } from "@/lib/documents/constants"
import {
  DOCUMENT_FILE_ACCEPT,
  documentContentType,
  safeDocumentFileName,
  validateDocumentFile,
} from "@/lib/documents/upload-policy"

type ApplicationComposePaneProps = {
  defaultStatus?: ApplicationStatus
  error?: string | null
  onClose: () => void
}

export function ApplicationComposePane({
  defaultStatus = "saved",
  error,
  onClose,
}: ApplicationComposePaneProps) {
  const router = useRouter()
  const [resumeFile, setResumeFile] = useState<File | null>(null)
  const [coverLetterFile, setCoverLetterFile] = useState<File | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  async function submitComposer(form: HTMLFormElement) {
    if (isSaving || !form.reportValidity()) return

    for (const file of [resumeFile, coverLetterFile]) {
      if (!file) continue
      const validationError = validateDocumentFile(file)
      if (validationError) {
        setLocalError(`${file.name}: ${validationError}`)
        return
      }
    }

    setIsSaving(true)
    setLocalError(null)
    const supabase = createClient()
    const uploadedPaths: string[] = []

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()
      if (authError || !user) throw new Error("Your session expired. Sign in and try again.")

      const formData = new FormData(form)
      for (const [kind, file] of [
        ["submitted_resume", resumeFile],
        ["submitted_cover_letter", coverLetterFile],
      ] as const) {
        if (!file) continue
        const contentType = documentContentType(file)
        if (!contentType) throw new Error(`${file.name} must be a PDF or DOCX file.`)
        const path = `${user.id}/application-packages/${crypto.randomUUID()}-${safeDocumentFileName(file.name)}`
        const { error: uploadError } = await supabase.storage
          .from(DOCUMENT_BUCKET)
          .upload(path, file, { contentType, upsert: false })
        if (uploadError) throw uploadError
        uploadedPaths.push(path)
        formData.set(`${kind}_path`, path)
        formData.set(`${kind}_name`, file.name)
      }

      const result = await createApplicationFromComposer(formData)
      if (!result.ok) {
        const messages = {
          "duplicate-description": "A role with this job description is already tracked.",
          "invalid-package": "The uploaded application package could not be verified.",
          "missing-required": "Company and role title are required.",
          "save-failed": "The role or its application package could not be saved.",
        }
        throw new Error(messages[result.error])
      }

      toast.success(
        uploadedPaths.length
          ? "Role and submitted documents saved"
          : "Role saved",
      )
      router.push(`/applications?id=${result.applicationId}`)
      router.refresh()
    } catch (submitError) {
      if (uploadedPaths.length) {
        await supabase.storage.from(DOCUMENT_BUCKET).remove(uploadedPaths)
      }
      setLocalError(
        submitError instanceof Error
          ? submitError.message
          : "The role could not be saved.",
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <form
      action={createApplication}
      className="motion-rise flex h-full min-h-0 flex-col bg-background"
      onSubmit={(event) => {
        event.preventDefault()
        void submitComposer(event.currentTarget)
      }}
      onKeyDown={(event) => {
        if (
          (event.metaKey || event.ctrlKey) &&
          (event.key === "Enter" || event.key === "NumpadEnter")
        ) {
          event.preventDefault()
          event.currentTarget.requestSubmit()
        }
      }}
    >
      <input type="hidden" name="form_context" value="mailbox" />

      <header className="flex shrink-0 items-center gap-2 border-b border-border bg-parchment/35 px-3 py-2.5 sm:px-4">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Close new role"
          onClick={onClose}
        >
          <X aria-hidden />
        </Button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="truncate text-sm font-semibold">New role</h2>
            <Badge variant="outline" className="h-5 text-[10px]">Draft</Badge>
          </div>
          <p className="hidden text-xs text-muted-foreground sm:block">
            Compose the opportunity and preserve the exact files you submitted.
          </p>
        </div>
        <Button type="submit" size="sm" disabled={isSaving}>
          {isSaving ? <Loader2 aria-hidden className="animate-spin" /> : <Save aria-hidden />}
          {isSaving ? "Saving…" : "Save role"}
        </Button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-4xl px-4 py-4 sm:px-6 sm:py-6">
          {error || localError ? (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>
                {localError ?? (error === "duplicate-description"
                  ? "A role with this job description is already tracked. Open the existing role or revise the description."
                  : "Company and role title are required.")}
              </AlertDescription>
            </Alert>
          ) : null}

          <div className="overflow-hidden rounded-xl border border-border bg-elevated shadow-paper">
            <ComposeLine icon={<Building2 aria-hidden />} label="To" htmlFor="compose-company">
              <Input
                id="compose-company"
                name="company_name"
                placeholder="Company name"
                autoComplete="organization"
                className="h-10 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
                autoFocus
                required
              />
            </ComposeLine>
            <Separator />
            <ComposeLine icon={<BriefcaseBusiness aria-hidden />} label="Subject" htmlFor="compose-title">
              <Input
                id="compose-title"
                name="job_title"
                placeholder="Role title"
                className="h-10 border-0 bg-transparent px-0 text-base font-medium shadow-none focus-visible:ring-0"
                required
              />
            </ComposeLine>
            <Separator />

            <div className="grid gap-4 bg-parchment/20 p-4 sm:grid-cols-2 xl:grid-cols-4">
              <ComposeField icon={<MapPin aria-hidden />} label="Location" htmlFor="compose-location">
                <Input id="compose-location" name="location" placeholder="Remote or city" />
              </ComposeField>
              <ComposeField icon={<CalendarDays aria-hidden />} label="Applied" htmlFor="compose-applied">
                <Input id="compose-applied" name="applied_at" type="date" />
              </ComposeField>
              <ComposeField icon={<CalendarDays aria-hidden />} label="Deadline" htmlFor="compose-deadline">
                <Input id="compose-deadline" name="deadline" type="date" />
              </ComposeField>
              <ComposeField icon={<BriefcaseBusiness aria-hidden />} label="Status" htmlFor="compose-status">
                <Select id="compose-status" name="status" defaultValue={defaultStatus} required>
                  {applicationStatuses.map((status) => (
                    <option key={status} value={status}>{statusLabels[status]}</option>
                  ))}
                </Select>
              </ComposeField>
            </div>
            <Separator />

            <div className="grid gap-4 p-4 sm:grid-cols-2">
              <ComposeField icon={<Link2 aria-hidden />} label="Job URL" htmlFor="compose-url">
                <Input
                  id="compose-url"
                  name="job_url"
                  type="url"
                  placeholder="https://company.com/careers/role"
                />
              </ComposeField>
              <ComposeField icon={<Building2 aria-hidden />} label="Referral" htmlFor="compose-referral">
                <Input
                  id="compose-referral"
                  name="referral_contact"
                  placeholder="Name, email, or relationship"
                />
              </ComposeField>
            </div>
            <Separator />

            <div className="p-4">
              <Label htmlFor="compose-next-action" className="text-xs text-muted-foreground">
                Next action
              </Label>
              <Input
                id="compose-next-action"
                name="next_action"
                placeholder="Follow up, prepare for interview, or submit materials"
                className="mt-2"
              />
            </div>
            <Separator />

            <div className="p-4 sm:p-5">
              <div className="mb-3">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Paperclip aria-hidden className="size-4 text-primary" />
                  Application package
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Attach the exact resume and cover letter you used. PDF or DOCX, up to 10 MB each.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <PackageFileInput
                  id="compose-resume-file"
                  label="Resume used"
                  file={resumeFile}
                  onChange={setResumeFile}
                  disabled={isSaving}
                />
                <PackageFileInput
                  id="compose-cover-letter-file"
                  label="Cover letter used"
                  file={coverLetterFile}
                  onChange={setCoverLetterFile}
                  disabled={isSaving}
                />
              </div>
              <p className="mt-3 text-[11px] leading-5 text-muted-foreground">
                Uploaded copies are private and locked after saving so this role always retains the submitted version.
              </p>
            </div>
            <Separator />

            <div className="p-4 sm:p-5">
              <div className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <BriefcaseBusiness aria-hidden className="size-3.5" />
                Job description
              </div>
              <Textarea
                id="compose-description"
                name="job_description"
                aria-label="Job description"
                placeholder="Paste the role description here, just like writing the body of an email…"
                className="paper-rule min-h-64 resize-y border-0 bg-transparent px-0 text-sm leading-7 shadow-none focus-visible:ring-0"
              />
            </div>
            <Separator />

            <div className="p-4 sm:p-5">
              <div className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <NotebookPen aria-hidden className="size-3.5" />
                Private notes
              </div>
              <Textarea
                id="compose-notes"
                name="notes"
                aria-label="Private notes"
                placeholder="Recruiter context, compensation notes, interview prep, or follow-up details"
                className="min-h-28 resize-y bg-parchment/25"
              />
            </div>
          </div>
        </div>
      </div>

      <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-border bg-background/95 px-4 py-3 backdrop-blur">
        <p className="hidden text-xs text-muted-foreground sm:block">
          Press <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono">⌘ Enter</kbd> to save
        </p>
        <div className="ml-auto flex gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>Discard</Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving ? <Loader2 aria-hidden className="animate-spin" /> : <Save aria-hidden />}
            {isSaving ? "Saving…" : "Save role"}
          </Button>
        </div>
      </footer>
    </form>
  )
}

function PackageFileInput({
  disabled,
  file,
  id,
  label,
  onChange,
}: {
  disabled: boolean
  file: File | null
  id: string
  label: string
  onChange: (file: File | null) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)

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
          const nextFile = event.target.files?.[0] ?? null
          if (nextFile) {
            const validationError = validateDocumentFile(nextFile)
            if (validationError) {
              toast.error(validationError)
              event.target.value = ""
              return
            }
          }
          onChange(nextFile)
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
              onChange(null)
              if (inputRef.current) inputRef.current.value = ""
            }}
          >
            <Trash2 aria-hidden />
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
          >
            <UploadCloud aria-hidden />
            Upload
          </Button>
        )}
      </div>
    </div>
  )
}

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function ComposeLine({
  children,
  htmlFor,
  icon,
  label,
}: {
  children: React.ReactNode
  htmlFor: string
  icon: React.ReactNode
  label: string
}) {
  return (
    <div className="grid grid-cols-[5.25rem_minmax(0,1fr)] items-center gap-3 px-4 py-1">
      <Label htmlFor={htmlFor} className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <span className="[&_svg]:size-3.5">{icon}</span>
        {label}
      </Label>
      {children}
    </div>
  )
}

function ComposeField({
  children,
  htmlFor,
  icon,
  label,
}: {
  children: React.ReactNode
  htmlFor: string
  icon: React.ReactNode
  label: string
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={htmlFor} className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <span className="[&_svg]:size-3.5">{icon}</span>
        {label}
      </Label>
      {children}
    </div>
  )
}
