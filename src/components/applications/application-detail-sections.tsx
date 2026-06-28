import {
  addCoverLetter,
  addResumeVersion,
  duplicateCoverLetterAction,
  duplicateResumeVersionAction,
  markCoverLetterSubmittedAction,
  markResumeVersionSubmittedAction,
} from "@/app/(app)/applications/actions";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/ui/submit-button";
import { Textarea } from "@/components/ui/textarea";
import {
  getPackageStatus,
  type CoverLetter,
  type ResumeVersion,
} from "@/lib/applications/package-types";
import { formatDateTime } from "@/lib/applications/status";

type ApplicationPackageSectionProps = {
  applicationId: string;
  resumeVersions: ResumeVersion[];
  coverLetters: CoverLetter[];
  submittedResumeVersionId: string | null;
  submittedCoverLetterId: string | null;
};

const packageStatusVariant: Record<
  ReturnType<typeof getPackageStatus>,
  string
> = {
  "Package Complete": "border-emerald-500/40 text-emerald-600",
  "Resume Missing": "border-amber-500/40 text-amber-600",
  "Cover Letter Missing": "border-amber-500/40 text-amber-600",
  "Package Incomplete": "text-muted-foreground",
};

export function ApplicationPackageSection({
  applicationId,
  resumeVersions,
  coverLetters,
  submittedResumeVersionId,
  submittedCoverLetterId,
}: ApplicationPackageSectionProps) {
  const packageStatus = getPackageStatus({
    submitted_resume_version_id: submittedResumeVersionId,
    submitted_cover_letter_id: submittedCoverLetterId,
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle>Application package</CardTitle>
            <CardDescription>
              Save the exact resume and cover letter you submitted for this role.
            </CardDescription>
          </div>
          <Badge variant="outline" className={packageStatusVariant[packageStatus]}>
            {packageStatus}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="grid gap-5">
        <DocumentGroup
          applicationId={applicationId}
          heading="Resume versions"
          emptyLabel="No resume versions yet."
          items={resumeVersions.map((version) => ({
            id: version.id,
            versionNumber: version.version_number,
            title: version.title,
            isSubmitted: version.id === submittedResumeVersionId,
            submittedAt: version.submitted_at,
          }))}
          addAction={addResumeVersion}
          submitAction={markResumeVersionSubmittedAction}
          duplicateAction={duplicateResumeVersionAction}
          idField="version_id"
        />

        <DocumentGroup
          applicationId={applicationId}
          heading="Cover letters"
          emptyLabel="No cover letters yet."
          items={coverLetters.map((letter) => ({
            id: letter.id,
            versionNumber: letter.version_number,
            title: letter.title,
            isSubmitted: letter.id === submittedCoverLetterId,
            submittedAt: letter.submitted_at,
          }))}
          addAction={addCoverLetter}
          submitAction={markCoverLetterSubmittedAction}
          duplicateAction={duplicateCoverLetterAction}
          idField="cover_letter_id"
        />
      </CardContent>
    </Card>
  );
}

type DocumentItem = {
  id: string;
  versionNumber: number;
  title: string | null;
  isSubmitted: boolean;
  submittedAt: string | null;
};

type DocumentGroupProps = {
  applicationId: string;
  heading: string;
  emptyLabel: string;
  items: DocumentItem[];
  addAction: (formData: FormData) => void | Promise<void>;
  submitAction: (formData: FormData) => void | Promise<void>;
  duplicateAction: (formData: FormData) => void | Promise<void>;
  idField: "version_id" | "cover_letter_id";
};

function DocumentGroup({
  applicationId,
  heading,
  emptyLabel,
  items,
  addAction,
  submitAction,
  duplicateAction,
  idField,
}: DocumentGroupProps) {
  return (
    <section className="grid gap-3">
      <h3 className="text-sm font-semibold">{heading}</h3>

      {items.length ? (
        <ul className="grid gap-2">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex flex-col gap-2 rounded-lg border border-border p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-medium">
                    v{item.versionNumber}
                    {item.title ? ` · ${item.title}` : ""}
                  </p>
                  {item.isSubmitted ? (
                    <Badge
                      variant="outline"
                      className="border-emerald-500/40 text-emerald-600"
                    >
                      Submitted
                    </Badge>
                  ) : null}
                </div>
                {item.isSubmitted && item.submittedAt ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Submitted {formatDateTime(item.submittedAt)}
                  </p>
                ) : null}
              </div>

              <div className="flex shrink-0 gap-2">
                {item.isSubmitted ? (
                  <form action={duplicateAction}>
                    <input type="hidden" name="application_id" value={applicationId} />
                    <input type="hidden" name={idField} value={item.id} />
                    <SubmitButton
                      type="submit"
                      variant="outline"
                      size="sm"
                      pendingLabel="Duplicating..."
                    >
                      Duplicate to edit
                    </SubmitButton>
                  </form>
                ) : (
                  <form action={submitAction}>
                    <input type="hidden" name="application_id" value={applicationId} />
                    <input type="hidden" name={idField} value={item.id} />
                    <SubmitButton
                      type="submit"
                      variant="outline"
                      size="sm"
                      pendingLabel="Marking..."
                    >
                      Mark submitted
                    </SubmitButton>
                  </form>
                )}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
          {emptyLabel}
        </p>
      )}

      <form action={addAction} className="grid gap-3 rounded-lg border p-4">
        <input type="hidden" name="application_id" value={applicationId} />
        <div className="grid gap-2">
          <Label htmlFor={`${idField}-title`}>Title</Label>
          <Input
            id={`${idField}-title`}
            name="title"
            placeholder="e.g. Tailored for the platform team"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor={`${idField}-content`}>Content</Label>
          <Textarea
            id={`${idField}-content`}
            name="content"
            placeholder="Paste the document content for this version."
          />
        </div>
        <div>
          <SubmitButton type="submit" size="sm" pendingLabel="Adding...">
            Add {heading.toLowerCase().replace(/s$/, "")}
          </SubmitButton>
        </div>
      </form>
    </section>
  );
}
