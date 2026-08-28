import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { deleteCoverLetterDocumentAction, duplicateCoverLetterDocumentAction, submitCoverLetterDocumentAction, updateCoverLetterAction } from "@/app/(app)/documents/actions";
import { DocumentEditor } from "@/components/documents/document-editor";
import { AppPage } from "@/components/layout/app-page";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { createSignedDocumentUrl, getCoverLetter, toEditorModel } from "@/lib/documents/repository";

export const metadata: Metadata = { title: "Cover letter" };

export default async function CoverLetterPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; saved?: string }> }) {
  const [{ id }, state, user] = await Promise.all([params, searchParams, requireCurrentUser()]);
  const letter = await getCoverLetter(id);
  if (!letter) notFound();
  const signedUrl = await createSignedDocumentUrl(letter.file_path);
  return <AppPage><DocumentEditor model={toEditorModel("cover_letter", letter)} userId={user.id} signedUrl={signedUrl} saveAction={updateCoverLetterAction.bind(null, id)} duplicateAction={duplicateCoverLetterDocumentAction.bind(null, id)} submitAction={submitCoverLetterDocumentAction.bind(null, id)} deleteAction={deleteCoverLetterDocumentAction.bind(null, id)} state={state} /></AppPage>;
}
