import Link from "next/link";
import {
  CheckCircle2,
  Copy,
  Download,
  ExternalLink,
  FileArchive,
  FileCode2,
  FileLock2,
  Star,
  Trash2,
} from "lucide-react";

import {
  deleteCoverLetterDocumentAction,
  deleteMasterResumeAction,
  deleteTailoredResumeAction,
  duplicateCoverLetterDocumentAction,
  duplicateMasterResumeAction,
  duplicateTailoredResumeAction,
  setDefaultResumeAction,
  submitCoverLetterDocumentAction,
  submitTailoredResumeAction,
} from "@/app/(app)/documents/actions";
import { DocumentFilePanel } from "@/components/documents/document-file-panel";
import { AppPage, AppPageHeader } from "@/components/layout/app-page";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LATEX_ENGINE_LABELS } from "@/lib/latex/constants";
import type { LatexDocumentDTO } from "@/lib/latex/types";

const OVERLEAF_IMPORT_URL = "https://www.overleaf.com/docs";

function documentTypeLabel(kind: LatexDocumentDTO["kind"]) {
  if (kind === "master_resume") return "Master resume";
  if (kind === "resume_version") return "Tailored resume";
  return "Cover letter";
}

export function OverleafWorkspace({
  document,
  projectDataUrl,
  userId,
  signedUrl,
}: {
  document: LatexDocumentDTO;
  projectDataUrl: string;
  userId: string;
  signedUrl: string | null;
}) {
  const typeLabel = documentTypeLabel(document.kind);
  const projectHref = `/api/latex-documents/${document.kind}/${document.id}/project`;
  const duplicateAction =
    document.kind === "master_resume"
      ? duplicateMasterResumeAction.bind(null, document.id)
      : document.kind === "resume_version"
        ? duplicateTailoredResumeAction.bind(null, document.id)
        : duplicateCoverLetterDocumentAction.bind(null, document.id);
  const deleteAction =
    document.kind === "master_resume"
      ? deleteMasterResumeAction.bind(null, document.id)
      : document.kind === "resume_version"
        ? deleteTailoredResumeAction.bind(null, document.id)
        : deleteCoverLetterDocumentAction.bind(null, document.id);

  return (
    <AppPage size="wide">
      <AppPageHeader
        title={document.title}
        description={
          document.subtitle ??
          "Open a private copy of this LaTeX project in Overleaf to edit, compile, and collaborate."
        }
        action={
          <Link href={document.returnHref} className={buttonVariants({ variant: "outline" })}>
            Back
          </Link>
        }
      >
        <div className="mt-3 flex flex-wrap gap-2">
          <Badge variant="outline">{typeLabel}</Badge>
          <Badge variant="secondary">{LATEX_ENGINE_LABELS[document.engine]}</Badge>
          <Badge variant="secondary">
            {document.assets.length} {document.assets.length === 1 ? "asset" : "assets"}
          </Badge>
          {document.isDefault ? (
            <Badge className="bg-primary/12 text-primary hover:bg-primary/12">
              <Star aria-hidden className="mr-1 size-3" />
              Default
            </Badge>
          ) : null}
          {document.locked ? (
            <Badge className="bg-success/12 text-success hover:bg-success/12">
              <CheckCircle2 aria-hidden className="mr-1 size-3" />
              Submitted
            </Badge>
          ) : null}
        </div>
      </AppPageHeader>

      {document.locked ? (
        <Alert>
          <FileLock2 aria-hidden />
          <AlertDescription>
            This submitted record is locked. Opening it in Overleaf creates an editable copy without
            changing the version saved in JobMaxxing.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(20rem,0.62fr)]">
        <div className="grid content-start gap-5">
          <Card className="overflow-hidden border-primary/20 shadow-paper">
            <CardHeader className="border-b border-border bg-[linear-gradient(120deg,color-mix(in_oklch,var(--primary),transparent_92%),transparent_68%)]">
              <span className="mb-3 grid size-10 place-items-center rounded-lg border border-primary/20 bg-background text-primary shadow-sm">
                <ExternalLink aria-hidden className="size-5" />
              </span>
              <CardTitle>Open in Overleaf</CardTitle>
              <CardDescription>
                JobMaxxing will send a compressed copy containing main.tex and every supporting
                asset. Your project stays private until you choose to send it.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-5">
              <form
                action={OVERLEAF_IMPORT_URL}
                method="post"
                target="_blank"
                rel="noopener noreferrer"
                acceptCharset="UTF-8"
                className="grid gap-3"
              >
                <input type="hidden" name="snip_uri" value={projectDataUrl} />
                <input type="hidden" name="main_document" value="main.tex" />
                <input type="hidden" name="engine" value={document.engine} />
                <Button type="submit" size="lg" className="h-11 w-full sm:w-fit sm:px-5">
                  Open in Overleaf
                  <ExternalLink aria-hidden />
                </Button>
                <p className="text-xs leading-5 text-muted-foreground">
                  Opens a new Overleaf project in another tab. Each click creates a new copy; edits
                  made in Overleaf do not sync back automatically.
                </p>
              </form>

              <div className="grid gap-3 rounded-xl border border-border bg-parchment/35 p-4 sm:grid-cols-3">
                <div>
                  <p className="micro-label text-muted-foreground">1 · Import</p>
                  <p className="mt-1 text-sm">Open this saved source and its assets in Overleaf.</p>
                </div>
                <div>
                  <p className="micro-label text-muted-foreground">2 · Finish</p>
                  <p className="mt-1 text-sm">Edit and compile with Overleaf&apos;s cloud tools.</p>
                </div>
                <div>
                  <p className="micro-label text-muted-foreground">3 · Return</p>
                  <p className="mt-1 text-sm">Export the final PDF and attach it here.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileArchive aria-hidden className="size-4 text-primary" />
                Project contents
              </CardTitle>
              <CardDescription>
                Overleaf receives main.tex plus {document.assets.length} supporting {document.assets.length === 1 ? "file" : "files"}.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline">
                <a href={projectHref}>
                  <Download aria-hidden />
                  Download project ZIP
                </a>
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="grid content-start gap-5">
          <Card>
            <CardHeader>
              <CardTitle>Final document</CardTitle>
              <CardDescription>
                After compiling in Overleaf, download the finished PDF and attach it here before
                marking this document as submitted.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DocumentFilePanel
                kind={document.kind}
                id={document.id}
                userId={userId}
                filePath={document.filePath}
                signedUrl={signedUrl}
                locked={document.locked}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Document actions</CardTitle>
              <CardDescription>Manage the JobMaxxing record for this Overleaf project.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2">
              {document.kind === "master_resume" && !document.isDefault ? (
                <form action={setDefaultResumeAction.bind(null, document.id)}>
                  <Button type="submit" variant="outline" className="w-full justify-start">
                    <Star aria-hidden />
                    Make default resume
                  </Button>
                </form>
              ) : null}

              {document.kind !== "master_resume" && !document.locked ? (
                <form
                  action={
                    document.kind === "resume_version"
                      ? submitTailoredResumeAction.bind(null, document.id)
                      : submitCoverLetterDocumentAction.bind(null, document.id)
                  }
                >
                  <Button
                    type="submit"
                    variant="outline"
                    className="w-full justify-start"
                    disabled={!document.filePath}
                    title={!document.filePath ? "Attach the PDF exported from Overleaf first." : undefined}
                  >
                    <CheckCircle2 aria-hidden />
                    Mark as submitted
                  </Button>
                </form>
              ) : null}

              <form action={duplicateAction}>
                <Button type="submit" variant="outline" className="w-full justify-start">
                  <Copy aria-hidden />
                  {document.locked ? "Duplicate to edit" : "Duplicate document"}
                </Button>
              </form>

              {!document.locked ? (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="w-full justify-start">
                      <Trash2 aria-hidden />
                      Delete document
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete this document?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This removes the saved LaTeX source, private assets, and attachment from
                        JobMaxxing. Projects already imported into Overleaf are unaffected.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <form action={deleteAction}>
                        <Button type="submit" variant="destructive" className="w-full">
                          Delete permanently
                        </Button>
                      </form>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileCode2 aria-hidden className="size-4 text-primary" />
                About the handoff
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm leading-6 text-muted-foreground">
              Overleaf&apos;s import endpoint creates a copy rather than a live connection. Keep the
              Overleaf project as your working version, and attach its final export here so your
              application package contains the exact file you used.
            </CardContent>
          </Card>
        </div>
      </div>
    </AppPage>
  );
}
