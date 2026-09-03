"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Download, FileText, Loader2, Paperclip, Trash2, UploadCloud } from "lucide-react";
import { toast } from "sonner";

import { attachDocumentFileAction, removeDocumentFileAction } from "@/app/(app)/documents/actions";
import { DocumentPreviewButton } from "@/components/previews/document-preview-dialog";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { DOCUMENT_BUCKET } from "@/lib/documents/constants";
import {
  DOCUMENT_FILE_ACCEPT,
  documentContentType,
  safeDocumentFileName,
  validateDocumentFile,
} from "@/lib/documents/upload-policy";
import type { DocumentKind } from "@/lib/documents/types";

const folders: Record<DocumentKind, string> = {
  master_resume: "master-resumes",
  resume_version: "resume-versions",
  cover_letter: "cover-letters",
};

export function DocumentFilePanel({
  kind,
  id,
  userId,
  filePath,
  signedUrl,
  locked,
}: {
  kind: DocumentKind;
  id: string;
  userId: string;
  filePath: string | null;
  signedUrl: string | null;
  locked: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [removing, startRemove] = useTransition();
  const name = filePath?.split("/").at(-1)?.replace(/^[0-9a-f-]{36}-/, "") ?? null;
  const isPdf = name?.toLowerCase().endsWith(".pdf") ?? false;

  async function handleFile(file: File | undefined) {
    if (!file) return;
    const validationError = validateDocumentFile(file);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setUploading(true);
    const supabase = createClient();
    const path = `${userId}/${folders[kind]}/${id}/${crypto.randomUUID()}-${safeDocumentFileName(file.name)}`;
    const { error } = await supabase.storage
      .from(DOCUMENT_BUCKET)
      .upload(path, file, {
        contentType: documentContentType(file) ?? file.type,
        upsert: false,
      });

    if (error) {
      setUploading(false);
      toast.error(error.message);
      return;
    }

    const result = await attachDocumentFileAction(kind, id, path);
    if (!result.success) {
      await supabase.storage.from(DOCUMENT_BUCKET).remove([path]);
      setUploading(false);
      toast.error(result.message);
      return;
    }

    setUploading(false);
    toast.success(filePath ? "File replaced" : "File attached");
    router.refresh();
  }

  function handleRemove() {
    startRemove(async () => {
      const result = await removeDocumentFileAction(kind, id);
      if (result.success) {
        toast.success(result.message);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <div className="grid gap-4">
      <input
        ref={inputRef}
        type="file"
        accept={DOCUMENT_FILE_ACCEPT}
        className="sr-only"
        onChange={(event) => {
          void handleFile(event.target.files?.[0]);
          event.target.value = "";
        }}
      />

      {filePath ? (
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-parchment/45 p-4 sm:flex-row sm:items-center">
          <span className="grid size-9 shrink-0 place-items-center rounded-md border border-border bg-card text-primary"><FileText aria-hidden className="size-4" /></span>
          <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{name}</span><span className="block text-xs text-muted-foreground">Private {isPdf ? "PDF" : "DOCX"} attachment</span></span>
          <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:flex-nowrap">
            <DocumentPreviewButton kind={kind} id={id} title={name ?? undefined} className="flex-1 sm:flex-none" />
            {signedUrl ? <Button asChild variant="outline" size="sm" className="flex-1 sm:flex-none"><a href={signedUrl} target="_blank" rel="noreferrer"><Download aria-hidden />Download</a></Button> : null}
            {!locked ? <Button variant="outline" size="sm" disabled={uploading} onClick={() => inputRef.current?.click()} className="flex-1 sm:flex-none">{uploading ? <Loader2 aria-hidden className="animate-spin" /> : <UploadCloud aria-hidden />}Replace</Button> : null}
            {!locked ? <Button variant="ghost" size="icon-sm" disabled={removing} onClick={handleRemove} aria-label="Remove attachment" className="text-destructive hover:text-destructive">{removing ? <Loader2 aria-hidden className="animate-spin" /> : <Trash2 aria-hidden />}</Button> : null}
          </div>
        </div>
      ) : (
        <Button type="button" variant="outline" disabled={locked || uploading} onClick={() => inputRef.current?.click()} className="surface-grid-sm grid h-auto min-h-32 w-full place-items-center whitespace-normal rounded-lg border-dashed border-border-strong bg-parchment/35 p-5 text-center hover:border-primary/45 hover:bg-primary/[0.035]">
          <span><span className="mx-auto grid size-9 place-items-center rounded-md border border-border bg-card text-muted-foreground">{uploading ? <Loader2 aria-hidden className="size-4 animate-spin" /> : <Paperclip aria-hidden className="size-4" />}</span><span className="mt-3 block text-sm font-medium">{uploading ? "Uploading securely…" : "Attach a PDF or DOCX"}</span><span className="mt-1 block text-xs text-muted-foreground">Private · 10 MB maximum</span></span>
        </Button>
      )}

      {filePath ? <p className="text-xs leading-5 text-muted-foreground">Preview opens {isPdf ? "the PDF" : "a readable version of the DOCX"} in a full-screen viewer without leaving this page.</p> : null}
    </div>
  );
}
