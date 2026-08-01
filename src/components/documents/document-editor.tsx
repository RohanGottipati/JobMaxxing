import Link from "next/link";
import { CheckCircle2, Copy, FileLock2, Save, Star, Trash2 } from "lucide-react";

import { DocumentFilePanel } from "@/components/documents/document-file-panel";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { ApplicationOption, DocumentEditorModel, MasterResumeItem } from "@/lib/documents/types";

type FormAction = (formData: FormData) => void | Promise<void>;
type SimpleAction = () => void | Promise<void>;

export function DocumentEditor({
  model,
  userId,
  signedUrl,
  masterResumes = [],
  saveAction,
  duplicateAction,
  submitAction,
  deleteAction,
  defaultAction,
  isDefault = false,
  state,
}: {
  model: DocumentEditorModel;
  userId: string;
  signedUrl: string | null;
  masterResumes?: MasterResumeItem[];
  applications?: ApplicationOption[];
  saveAction: FormAction;
  duplicateAction?: SimpleAction;
  submitAction?: SimpleAction;
  deleteAction?: SimpleAction;
  defaultAction?: SimpleAction;
  isDefault?: boolean;
  state?: { error?: string; saved?: string };
}) {
  const libraryHref = model.kind === "cover_letter" ? "/cover-letters" : "/resumes";
  const typeLabel = model.kind === "master_resume" ? "Master resume" : model.kind === "resume_version" ? "Tailored resume" : "Cover letter";
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(20rem,0.62fr)]">
      <Card className="min-w-0">
        <CardHeader className="border-b border-border bg-parchment/35">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div><div className="flex flex-wrap items-center gap-2"><Badge variant="outline">{typeLabel}</Badge>{model.versionNumber ? <Badge variant="secondary">Version {model.versionNumber}</Badge> : null}{isDefault ? <Badge className="bg-primary/12 text-primary hover:bg-primary/12"><Star aria-hidden className="mr-1 size-3" />Default</Badge> : null}{model.isSubmitted ? <Badge className="bg-success/12 text-success hover:bg-success/12"><CheckCircle2 aria-hidden className="mr-1 size-3" />Submitted</Badge> : null}</div><CardTitle className="mt-3 text-xl">{model.title || typeLabel}</CardTitle><CardDescription className="mt-1">{model.application ? `${model.application.companyName} · ${model.application.jobTitle}` : "Reusable across applications"}</CardDescription></div>
            <Link href={libraryHref} className={buttonVariants({ variant: "outline", size: "sm" })}>Back to library</Link>
          </div>
        </CardHeader>
        <CardContent className="grid gap-5">
          {state?.error ? <Alert variant="destructive"><AlertDescription>Check the title and try again.</AlertDescription></Alert> : null}
          {state?.saved ? <Alert><AlertDescription>Your changes were saved.</AlertDescription></Alert> : null}
          {model.isSubmitted ? <Alert><FileLock2 aria-hidden /><AlertDescription>This is the exact submitted version, so its text and file are locked. Duplicate it to make changes.</AlertDescription></Alert> : null}
          <form action={saveAction} className="grid gap-5">
            <div className="grid gap-1.5"><Label htmlFor="document-title">{model.kind === "master_resume" ? "Name" : "Title"}</Label><Input id="document-title" name={model.kind === "master_resume" ? "name" : "title"} defaultValue={model.title} placeholder={model.kind === "master_resume" ? "e.g. Product engineering master" : "e.g. Tailored for platform team"} disabled={model.isSubmitted} required /></div>
            {model.kind === "resume_version" ? <div className="grid gap-1.5"><Label htmlFor="base_resume_id">Based on</Label><Select id="base_resume_id" name="base_resume_id" defaultValue={model.baseResumeId ?? ""} disabled={model.isSubmitted}><option value="">No master resume</option>{masterResumes.map((resume) => <option key={resume.id} value={resume.id}>{resume.name}{resume.is_default ? " (default)" : ""}</option>)}</Select></div> : null}
            <div className="grid gap-1.5"><div className="flex items-end justify-between gap-3"><Label htmlFor="document-content">Text content</Label><span className="text-xs text-muted-foreground">Optional when a file is attached</span></div><Textarea id="document-content" name="content" defaultValue={model.content} placeholder="Paste or write the document content here." className="paper-rule min-h-[32rem] resize-y bg-elevated font-mono text-[0.82rem] leading-6" disabled={model.isSubmitted} /></div>
            {!model.isSubmitted ? <div><Button type="submit" size="lg" className="h-10 px-4"><Save aria-hidden />Save changes</Button></div> : null}
          </form>
        </CardContent>
      </Card>

      <div className="grid content-start gap-5">
        <Card><CardHeader><CardTitle>Private attachment</CardTitle><CardDescription>PDF or DOCX, up to 10 MB. Preview links expire after five minutes.</CardDescription></CardHeader><CardContent><DocumentFilePanel kind={model.kind} id={model.id} userId={userId} filePath={model.filePath} signedUrl={signedUrl} locked={model.isSubmitted} /></CardContent></Card>
        {model.content ? <Card><CardHeader><CardTitle>Text preview</CardTitle><CardDescription>A clean reading view of the saved text.</CardDescription></CardHeader><CardContent><div className="paper-rule max-h-[30rem] overflow-y-auto whitespace-pre-wrap rounded-lg border border-border bg-parchment/45 p-4 text-sm leading-8 text-muted-foreground">{model.content}</div></CardContent></Card> : null}
        <Card><CardHeader><CardTitle>Document actions</CardTitle><CardDescription>Manage this document without losing submitted history.</CardDescription></CardHeader><CardContent className="grid gap-2">
          {defaultAction && !isDefault ? <form action={defaultAction}><Button type="submit" variant="outline" className="w-full justify-start"><Star aria-hidden />Make default resume</Button></form> : null}
          {submitAction && !model.isSubmitted ? <AlertDialog><AlertDialogTrigger asChild><Button variant="outline" className="w-full justify-start"><CheckCircle2 aria-hidden />Mark as submitted</Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Mark this document as submitted?</AlertDialogTitle><AlertDialogDescription>This locks the current text and attachment as a permanent record of what you sent. You can duplicate it later to create an editable version.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><form action={submitAction}><Button type="submit" className="w-full">Mark submitted</Button></form></AlertDialogFooter></AlertDialogContent></AlertDialog> : null}
          {duplicateAction ? <form action={duplicateAction}><Button type="submit" variant="outline" className="w-full justify-start"><Copy aria-hidden />{model.isSubmitted ? "Duplicate to edit" : "Duplicate document"}</Button></form> : null}
          {deleteAction && !model.isSubmitted ? <AlertDialog><AlertDialogTrigger asChild><Button variant="destructive" className="w-full justify-start"><Trash2 aria-hidden />Delete document</Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete this document?</AlertDialogTitle><AlertDialogDescription>This removes its saved text and private attachment. This action cannot be undone.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><form action={deleteAction}><Button type="submit" variant="destructive" className="w-full">Delete permanently</Button></form></AlertDialogFooter></AlertDialogContent></AlertDialog> : null}
        </CardContent></Card>
      </div>
    </div>
  );
}
