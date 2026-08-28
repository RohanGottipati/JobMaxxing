import {
  duplicateCoverLetterAction,
  duplicateResumeVersionAction,
  markCoverLetterSubmittedAction,
  markResumeVersionSubmittedAction,
} from "@/app/(app)/applications/actions";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
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
  "Package Complete": "border-success/40 text-success",
  "Resume Missing": "border-warning/40 text-warning",
  "Cover Letter Missing": "border-warning/40 text-warning",
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
      <CardHeader className="border-b border-border bg-parchment/35">
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
      <CardContent className="grid gap-4">
        <DocumentGroup
          applicationId={applicationId}
          heading="Resume versions"
          emptyLabel="No resume versions yet."
          items={resumeVersions.map((version) => ({
            id: version.id,
            versionNumber: version.version_number,
            title: version.title,
            isSubmitted: version.id === submittedResumeVersionId,
            hasBeenSubmitted: Boolean(version.submitted_at),
            submittedAt: version.submitted_at,
          }))}
          submitAction={markResumeVersionSubmittedAction}
          duplicateAction={duplicateResumeVersionAction}
          idField="version_id"
          createHref={`/resumes/versions/new?application=${applicationId}`}
          itemHref={(id) => `/resumes/versions/${id}`}
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
            hasBeenSubmitted: Boolean(letter.submitted_at),
            submittedAt: letter.submitted_at,
          }))}
          submitAction={markCoverLetterSubmittedAction}
          duplicateAction={duplicateCoverLetterAction}
          idField="cover_letter_id"
          createHref={`/cover-letters/new?application=${applicationId}`}
          itemHref={(id) => `/cover-letters/${id}`}
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
  hasBeenSubmitted: boolean;
  submittedAt: string | null;
};

type DocumentGroupProps = {
  applicationId: string;
  heading: string;
  emptyLabel: string;
  items: DocumentItem[];
  submitAction: (formData: FormData) => void | Promise<void>;
  duplicateAction: (formData: FormData) => void | Promise<void>;
  idField: "version_id" | "cover_letter_id";
  createHref: string;
  itemHref: (id: string) => string;
};

function DocumentGroup({
  applicationId,
  heading,
  emptyLabel,
  items,
  submitAction,
  duplicateAction,
  idField,
  createHref,
  itemHref,
}: DocumentGroupProps) {
  return (
    <section className="overflow-hidden rounded-lg border border-border">
      <div className="flex items-center justify-between gap-3 border-b border-border bg-parchment/50 px-4 py-3"><h3 className="text-sm font-semibold">{heading}</h3><Link href={createHref} className={buttonVariants({ variant: "outline", size: "sm" })}>Create new</Link></div>

      {items.length ? (
        <ul className="grid gap-2 p-3">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex flex-col gap-3 rounded-md border border-border bg-elevated p-3 sm:flex-row sm:items-center sm:justify-between"
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
                      className="border-success/40 text-success"
                    >
                      Submitted
                    </Badge>
                  ) : item.hasBeenSubmitted ? (
                    <Badge variant="secondary">Submitted previously</Badge>
                  ) : null}
                </div>
                {item.submittedAt ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Submitted {formatDateTime(item.submittedAt)}
                  </p>
                ) : null}
              </div>

              <div className="flex shrink-0 flex-wrap gap-2">
                <Link href={itemHref(item.id)} className={buttonVariants({ variant: "ghost", size: "sm" })}>Open</Link>
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
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm">Mark submitted</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Mark this version as submitted?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This preserves the exact document used for the application. Its text and attachment will be locked, but you can duplicate it later.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <form action={submitAction}>
                          <input type="hidden" name="application_id" value={applicationId} />
                          <input type="hidden" name={idField} value={item.id} />
                          <SubmitButton type="submit" pendingLabel="Marking…">
                            Mark submitted
                          </SubmitButton>
                        </form>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="m-3 rounded-lg border border-dashed p-5 text-center text-sm text-muted-foreground">
          {emptyLabel}
        </p>
      )}

    </section>
  );
}
